import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { exportMaster } from './export.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENCODER_SH = path.join(ROOT, 'export-upload.sh');

function ffmpegBin() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  if (fs.existsSync('/opt/homebrew/bin/ffmpeg')) {
    return '/opt/homebrew/bin/ffmpeg';
  }
  return 'ffmpeg';
}

function makeClip(dir) {
  const out = path.join(dir, 'master.mp4');
  const result = spawnSync(
    ffmpegBin(),
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=red:s=1920x1200:d=0.2:r=30',
      '-pix_fmt',
      'yuv420p',
      '-colorspace',
      'bt709',
      '-color_range',
      'tv',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-x264-params',
      'colormatrix=bt709:range=tv',
      '-frames:v',
      '6',
      out,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return out;
}

test('exportMaster rejects missing file and CRF outside 0-51', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-export-rej-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.throws(
    () => exportMaster({ input: path.join(dir, 'missing.mp4') }),
    /not found/,
  );
  assert.throws(() => exportMaster({ input: 'x.mp4', crf: 99 }), /0-51/);
  assert.throws(() => exportMaster({ input: 'x.mp4', crf: -1 }), /0-51/);
});

test('exportMaster writes three files, tags output, and refuses existing dir', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-export-ok-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const master = makeClip(dir);
  const outDir = path.join(dir, 'delivery');
  const result = exportMaster({ input: master, outputDir: outDir, crf: 23 });
  assert.equal(result.videoPath, path.join(outDir, 'video.mp4'));
  assert.equal(result.posterPath, path.join(outDir, 'poster.png'));
  assert.equal(result.manifestPath, path.join(outDir, 'export.json'));
  assert.ok(fs.existsSync(result.videoPath));
  assert.ok(fs.existsSync(result.posterPath));
  assert.ok(fs.existsSync(result.manifestPath));
  const probe = result.manifest.output.video.probe;
  assert.equal(probe.video.width, 1920);
  assert.equal(probe.video.height, 1200);
  assert.equal(probe.video.pix_fmt, 'yuv420p');
  assert.equal(probe.video.codec_name, 'h264');
  assert.equal(probe.video.color_range, 'tv');
  assert.equal(probe.video.color_space, 'bt709');
  assert.equal(probe.video.color_transfer, 'bt709');
  assert.equal(probe.video.color_primaries, 'bt709');
  assert.equal(probe.video.r_frame_rate, '30/1');
  assert.equal(probe.video.avg_frame_rate, '30/1');
  assert.equal(probe.audioStreamCount, 0);
  assert.equal(Number(probe.video.nb_frames), 6);
  assert.equal(result.manifest.crf, 23);
  assert.match(result.manifest.source.script, /export-upload\.sh$/);
  assert.equal(
    result.manifest.source.contents,
    fs.readFileSync(ENCODER_SH, 'utf8'),
  );
  assert.match(result.manifest.source.contents, /setparams=range=limited/);
  assert.equal(result.manifest.commands[0].bin, 'sh');
  const before = fs.statSync(master).mtimeMs;
  assert.throws(
    () => exportMaster({ input: master, outputDir: outDir, crf: 23 }),
    /already exists/,
  );
  assert.equal(fs.statSync(master).mtimeMs, before);
});
