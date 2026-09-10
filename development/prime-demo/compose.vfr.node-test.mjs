/* cspell:ignore setpts tpad */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { sourceNormalizeFilters, timingPlan } from './compose.mjs';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const SIZE = 32;
const FPS = 30;
const FRAME_BYTES = SIZE * SIZE * 3;

function runFfmpeg(args, extra = {}) {
  const result = spawnSync(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args],
    extra,
  );
  assert.equal(
    result.status,
    0,
    `${args.join(' ')}\n${result.stderr?.toString() || ''}`,
  );
  return result;
}

function writeColorPng(filePath, color) {
  runFfmpeg([
    '-f',
    'lavfi',
    '-i',
    `color=c=${color}:s=${SIZE}x${SIZE}:d=1:r=1`,
    '-frames:v',
    '1',
    filePath,
  ]);
}

function writeVfrMp4(filePath, segments) {
  const dir = path.dirname(filePath);
  const concatPath = path.join(dir, `${path.basename(filePath)}.concat.txt`);
  const lines = ['ffconcat version 1.0'];
  const last = segments[segments.length - 1];
  for (const segment of segments) {
    lines.push(`file ${path.basename(segment.file)}`);
    lines.push(`duration ${segment.duration}`);
  }
  lines.push(`file ${path.basename(last.file)}`);
  fs.writeFileSync(concatPath, `${lines.join('\n')}\n`);
  runFfmpeg([
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-fps_mode',
    'vfr',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-bf',
    '0',
    filePath,
  ]);
}

function writeCfrMp4(filePath, { redSeconds, blueSeconds }) {
  runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=0xFF0000:s=${SIZE}x${SIZE}:d=${redSeconds}:r=${FPS}`,
    '-f',
    'lavfi',
    '-i',
    `color=c=0x0000FF:s=${SIZE}x${SIZE}:d=${blueSeconds}:r=${FPS}`,
    '-filter_complex',
    '[0:v][1:v]concat=n=2:v=1:a=0',
    '-r',
    String(FPS),
    '-fps_mode',
    'cfr',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-bf',
    '0',
    filePath,
  ]);
}

function grabRgb(inputPath, vf, frameCount) {
  const result = runFfmpeg(
    [
      '-i',
      inputPath,
      '-vf',
      vf,
      '-frames:v',
      String(frameCount),
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      'pipe:1',
    ],
    { encoding: 'buffer' },
  );
  return result.stdout;
}

function pixel(buf, frameIndex) {
  const offset = frameIndex * FRAME_BYTES;
  if (offset + 3 > buf.length) {
    return null;
  }
  return [buf[offset], buf[offset + 1], buf[offset + 2]];
}

function sampleKind(buf, frameIndex) {
  const rgb = pixel(buf, frameIndex);
  if (!rgb) return 'EOF';
  const [r, g, b] = rgb;
  if (r > b + 40) return 'RED';
  if (b > r + 40) return 'BLUE';
  return `rgb(${r},${g},${b})`;
}

function productionVf(start, end, hold) {
  return sourceNormalizeFilters(timingPlan({ start, end, hold })).join(',');
}

function legacyVf(start, end, hold) {
  const timing = timingPlan({ start, end, hold });
  const parts = [
    `trim=start=${start}:end=${timing.trimEndExclusive}`,
    'setpts=PTS-STARTPTS',
    `fps=${FPS}`,
    `setpts=N/${FPS}/TB`,
  ];
  if (timing.holdFrames > 0) {
    parts.push(`tpad=stop_mode=clone:stop=${timing.holdFrames}`);
  }
  return parts.join(',');
}

test('timingPlan maps inclusive seconds onto exact 30fps frame indices', () => {
  const atOne = timingPlan({ start: 1, end: 3, hold: 2 });
  assert.equal(atOne.contentFrames, 61);
  assert.equal(atOne.holdFrames, 60);
  assert.equal(atOne.outputFrames, 121);
  assert.equal(atOne.startFrame, 30);
  assert.equal(atOne.endFrameExclusive, 91);
  assert.equal(atOne.trimEndExclusive, 1 + 61 / 30);

  const onGrid = timingPlan({ start: 1.2, end: 6.4, hold: 0 });
  assert.equal(onGrid.contentFrames, 157);
  assert.equal(onGrid.startFrame, 36);
  assert.equal(onGrid.endFrameExclusive, 193);
  assert.equal(onGrid.holdFrames, 0);
});

test('VFR: trim start=1 keeps held red and switches to blue 2s later', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-compose-vfr-'));
  try {
    const red = path.join(dir, 'red.png');
    const blue = path.join(dir, 'blue.png');
    const input = path.join(dir, 'vfr.mp4');
    writeColorPng(red, '0xFF0000');
    writeColorPng(blue, '0x0000FF');
    writeVfrMp4(input, [
      { file: red, duration: 3 },
      { file: blue, duration: 1 },
    ]);

    const start = 1;
    const end = 3;
    const hold = 2;
    const timing = timingPlan({ start, end, hold });
    const rgb = grabRgb(
      input,
      productionVf(start, end, hold),
      timing.outputFrames,
    );
    assert.equal(rgb.length, timing.outputFrames * FRAME_BYTES);
    assert.equal(sampleKind(rgb, 0), 'RED');
    assert.equal(sampleKind(rgb, 30), 'RED');
    assert.equal(sampleKind(rgb, 59), 'RED');
    assert.equal(sampleKind(rgb, 60), 'BLUE');
    assert.equal(sampleKind(rgb, 90), 'BLUE');
    assert.equal(sampleKind(rgb, 120), 'BLUE');

    const broken = grabRgb(
      input,
      legacyVf(start, end, 0),
      timing.contentFrames,
    );
    assert.equal(sampleKind(broken, 0), 'BLUE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('VFR last encoded frame is held through inclusive --end', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-compose-vfr-end-'));
  try {
    const red = path.join(dir, 'red.png');
    const blue = path.join(dir, 'blue.png');
    const input = path.join(dir, 'vfr.mp4');
    writeColorPng(red, '0xFF0000');
    writeColorPng(blue, '0x0000FF');
    writeVfrMp4(input, [
      { file: red, duration: 1 },
      { file: blue, duration: 0.04 },
    ]);

    const start = 0;
    const end = 2.5;
    const timing = timingPlan({ start, end, hold: 0 });
    const rgb = grabRgb(
      input,
      productionVf(start, end, 0),
      timing.outputFrames,
    );
    assert.equal(rgb.length, timing.outputFrames * FRAME_BYTES);
    assert.equal(sampleKind(rgb, 0), 'RED');
    assert.equal(sampleKind(rgb, 30), 'BLUE');
    assert.equal(sampleKind(rgb, timing.outputFrames - 1), 'BLUE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CFR pixels match the previous trim-then-fps chain', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-compose-cfr-'));
  try {
    const input = path.join(dir, 'cfr.mp4');
    writeCfrMp4(input, { redSeconds: 3, blueSeconds: 2 });
    const start = 1;
    const end = 4;
    const hold = 2;
    const timing = timingPlan({ start, end, hold });
    const production = grabRgb(
      input,
      productionVf(start, end, hold),
      timing.outputFrames,
    );
    const legacy = grabRgb(
      input,
      legacyVf(start, end, hold),
      timing.outputFrames,
    );
    assert.equal(production.length, timing.outputFrames * FRAME_BYTES);
    assert.deepEqual(production, legacy);
    assert.equal(sampleKind(production, 0), 'RED');
    assert.equal(sampleKind(production, 59), 'RED');
    assert.equal(sampleKind(production, 60), 'BLUE');
    assert.equal(sampleKind(production, timing.outputFrames - 1), 'BLUE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
