/**
 * Compress a composed Prime master for upload via export-upload.sh.
 * Writes video.mp4, poster.png, and export.json into a new directory.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { newTimestampId, sha256File } from './feature.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ENCODER_SH = path.join(SCRIPT_DIR, 'export-upload.sh');
const FFMPEG_DEFAULT = '/opt/homebrew/bin/ffmpeg';
const FFPROBE_DEFAULT = '/opt/homebrew/bin/ffprobe';
const WIDTH = 1920;
const HEIGHT = 1200;
const FPS = 30;
const VIDEO_PROBE_KEYS =
  'codec_name,profile,level,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries,avg_frame_rate,r_frame_rate,nb_frames,duration,codec_tag_string,has_b_frames'.split(
    ',',
  );
export const DEFAULT_CRF = 23;

function resolveBin(envName, preferred, fallback) {
  if (process.env[envName]) return process.env[envName];
  return fs.existsSync(preferred) ? preferred : fallback;
}

const ffmpegBin = () => resolveBin('FFMPEG', FFMPEG_DEFAULT, 'ffmpeg');
const ffprobeBin = () => resolveBin('FFPROBE', FFPROBE_DEFAULT, 'ffprobe');

function run(bin, args) {
  const env = { ...process.env, FFMPEG: ffmpegBin(), FFPROBE: ffprobeBin() };
  const result = spawnSync(bin, args, { encoding: 'utf8', env });
  if (result.status !== 0) {
    throw new Error(
      `${bin} exited ${result.status}\n${(result.stderr || result.stdout || '').trim()}`,
    );
  }
  return result;
}

function probe(filePath) {
  const { stdout } = run(ffprobeBin(), [
    '-v',
    'error',
    '-show_format',
    '-show_streams',
    '-of',
    'json',
    filePath,
  ]);
  return JSON.parse(stdout);
}

const videoStream = (p) =>
  (p.streams || []).find((s) => s.codec_type === 'video') || null;
const audioCount = (p) =>
  (p.streams || []).filter((s) => s.codec_type === 'audio').length;

function is30Rate(rate) {
  if (rate === '30' || rate === '30/1') return true;
  const [a, b] = String(rate || '')
    .split('/')
    .map(Number);
  const fps = b ? a / b : a;
  return Number.isFinite(fps) && Math.abs(fps - FPS) < 1e-6;
}

function is30(v) {
  return is30Rate(v.r_frame_rate) && is30Rate(v.avg_frame_rate);
}

function frameCount(v, label) {
  const n = Number(v.nb_frames);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} nb_frames must be a positive integer`);
  }
  return n;
}

function durationSec(v, format, label) {
  const d = Number(v.duration ?? format?.duration);
  if (!Number.isFinite(d) || d <= 0) {
    throw new Error(`${label} duration must be a finite positive number`);
  }
  return d;
}

function summarize(p) {
  const v = videoStream(p);
  const video = v ? {} : null;
  if (v) {
    for (const key of VIDEO_PROBE_KEYS) video[key] = v[key] ?? null;
  }
  return {
    format: {
      duration: p.format?.duration ?? null,
      size: p.format?.size ?? null,
      bitRate: p.format?.bit_rate ?? null,
    },
    video,
    audioStreamCount: audioCount(p),
  };
}

function assertMaster(v, label, format) {
  if (!v) throw new Error(`${label} has no video stream`);
  if (v.width !== WIDTH || v.height !== HEIGHT) {
    throw new Error(`${label} must be ${WIDTH}x${HEIGHT}`);
  }
  if (v.pix_fmt !== 'yuv420p') {
    throw new Error(`${label} must be yuv420p`);
  }
  if (!is30(v)) {
    throw new Error(`${label} must be ${FPS}fps (r and avg)`);
  }
  if (v.color_space !== 'bt709') {
    throw new Error(`${label} must have bt709 matrix`);
  }
  if (v.color_range !== 'tv' && v.color_range !== 'limited') {
    throw new Error(`${label} must be tv-range`);
  }
  frameCount(v, label);
  durationSec(v, format, label);
}

function assertOutput(outP, inV, inP) {
  const v = videoStream(outP);
  assertMaster(v, 'output', outP.format);
  if (v.codec_name !== 'h264' || audioCount(outP) !== 0) {
    throw new Error('output must be H.264 with no audio');
  }
  if (v.color_primaries !== 'bt709' || v.color_transfer !== 'bt709') {
    throw new Error('output must tag bt709 primaries and transfer');
  }
  if (frameCount(v, 'output') !== frameCount(inV, 'input')) {
    throw new Error('output nb_frames does not match input');
  }
  const inDur = durationSec(inV, inP.format, 'input');
  const outDur = durationSec(v, outP.format, 'output');
  if (Math.abs(outDur - inDur) > 0.001) {
    throw new Error(`output duration ${outDur}s != input ${inDur}s`);
  }
}

export function exportMaster({ input, outputDir = null, crf = DEFAULT_CRF }) {
  if (!Number.isInteger(crf) || crf < 0 || crf > 51) {
    throw new Error(
      `--crf must be an integer 0-51, got ${JSON.stringify(crf)}`,
    );
  }
  if (!input) throw new Error('input is required');
  const inputAbs = path.resolve(input);
  if (!fs.existsSync(inputAbs) || !fs.statSync(inputAbs).isFile()) {
    throw new Error(`input not found: ${inputAbs}`);
  }
  const inputProbe = probe(inputAbs);
  const inV = videoStream(inputProbe);
  assertMaster(inV, 'input', inputProbe.format);
  const outDir = path.resolve(
    outputDir ||
      path.join(path.dirname(inputAbs), 'deliveries', newTimestampId()),
  );
  if (fs.existsSync(outDir)) {
    throw new Error(`output directory already exists: ${outDir}`);
  }
  const videoPath = path.join(outDir, 'video.mp4');
  const posterPath = path.join(outDir, 'poster.png');
  const manifestPath = path.join(outDir, 'export.json');
  if (videoPath === inputAbs) throw new Error('refusing to overwrite master');
  fs.mkdirSync(outDir, { recursive: true });
  const shArgs = [ENCODER_SH, inputAbs, videoPath, String(crf)];
  const posterArgs = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-n',
    '-i',
    videoPath,
    '-an',
    '-frames:v',
    '1',
    posterPath,
  ];
  const commands = [
    { bin: 'sh', args: shArgs },
    { bin: ffmpegBin(), args: posterArgs },
  ];
  run('sh', shArgs);
  run(ffmpegBin(), posterArgs);
  const outputProbe = probe(videoPath);
  assertOutput(outputProbe, inV, inputProbe);
  const videoBytes = fs.statSync(videoPath).size;
  const posterBytes = fs.statSync(posterPath).size;
  const manifest = {
    createdAt: new Date().toISOString(),
    crf,
    input: {
      path: inputAbs,
      sha256: sha256File(inputAbs),
      bytes: fs.statSync(inputAbs).size,
      probe: summarize(inputProbe),
    },
    output: {
      video: {
        path: videoPath,
        sha256: sha256File(videoPath),
        bytes: videoBytes,
        probe: summarize(outputProbe),
      },
      poster: { path: posterPath, bytes: posterBytes },
    },
    source: {
      script: ENCODER_SH,
      sha256: sha256File(ENCODER_SH),
      contents: fs.readFileSync(ENCODER_SH, 'utf8'),
    },
    commands,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`video ${videoPath} ${videoBytes} bytes`);
  console.log(`poster ${posterPath} ${posterBytes} bytes`);
  console.log(
    `export.json ${manifestPath} ${fs.statSync(manifestPath).size} bytes`,
  );
  return { outputDir: outDir, videoPath, posterPath, manifestPath, manifest };
}
