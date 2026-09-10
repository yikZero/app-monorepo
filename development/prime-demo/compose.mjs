#!/usr/bin/env node
/* cspell:ignore alphamerge setpts tpad lanczos repeatlast faststart STARTPTS */
/**
 * Compose a landscape Prime benefit-demo MP4 from a portrait iOS simulator
 * recording. Independent of the native fixture and of capture/recording.
 *
 * Usage:
 *   node development/prime-demo/compose.mjs \
 *     --input raw.mp4 --output demo.mp4 --start 1.2 --end 6.4 [--hold 2] [--poster demo.png] [--layout preset.json]
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_LAYOUT_PATH, loadLayoutConfig } from './layout.mjs';
import {
  findSceneMarker,
  isTapOverlayActive,
  loadTapsConfig,
  markerOutputTime,
  resolveTapPlan,
  takeRawHash,
  tapSpriteGeq,
  tapSpriteSize,
} from './taps.mjs';

export const TOOL_NAME = 'prime-demo-compose';
export const TOOL_VERSION = '1.8.0';
export const CAMERA_EASINGS = [
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'smootherstep',
];
export const DEFAULT_CAMERA_EASING = 'ease-in-out';
const CAMERA_BOUNDARY_EPS = 1e-9;

const FFMPEG_DEFAULT = '/opt/homebrew/bin/ffmpeg';
const FFPROBE_DEFAULT = '/opt/homebrew/bin/ffprobe';

const OUTPUT_FPS = 30;
const CRF = 18;
const PRESET = 'fast';

class UsageError extends Error {}

function commandError(message, result) {
  const error = new Error(message);
  error.result = result;
  return error;
}

function resolveBin(envName, preferred, fallbackName) {
  const fromEnv = process.env[envName];
  if (fromEnv) return fromEnv;
  if (fs.existsSync(preferred)) return preferred;
  return fallbackName;
}

function ffmpegBin() {
  return resolveBin('FFMPEG', FFMPEG_DEFAULT, 'ffmpeg');
}

function ffprobeBin() {
  return resolveBin('FFPROBE', FFPROBE_DEFAULT, 'ffprobe');
}

function printUsage() {
  console.log(`Compose a 1920x1200 Prime demo MP4 from a portrait simulator recording.

Usage:
  node development/prime-demo/compose.mjs --input <video> --output <video> --start <sec> --end <sec> [options]

Options:
  --input   Raw portrait recording (absolute or relative path)
  --output  Composed H.264 MP4 path (1920x1200, 30fps, yuv420p, no audio)
  --start   Trim start in seconds (inclusive)
  --end     Trim end in seconds (inclusive). Final stable frame; not necessarily animationsComplete.
  --hold    Seconds to clone the final stable frame (default: 2)
  --poster  Optional still of the composed final stable frame
  --camera  Optional JSON of pan keyframes or event-relative moves (design px; each move sets arriveBefore or arriveAfter, not both)
  --taps    Optional JSON of circular tap guides (logical 393x852 device coords)
  --take    take.json for marker-anchored camera/taps (raw hash + matchedSceneKey)
  --layout  Optional compose preset JSON (default: presets/prime-393x852.json)
  --help    Show this help

--input and --output must resolve to different paths.
Re-running the same --input/--start/--end with a different --hold does not require recapture.
`);
}

function parseArgs(argv) {
  const options = {
    help: false,
    input: null,
    output: null,
    start: null,
    end: null,
    hold: 2,
    poster: null,
    camera: null,
    taps: null,
    take: null,
    layout: null,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      const eq = arg.match(/^--([a-z]+)=(.*)$/s);
      if (eq) {
        assignOption(options, eq[1], eq[2]);
      } else if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const value = argv[i + 1];
        if (value === undefined || value.startsWith('--')) {
          throw new UsageError(`Missing value for --${key}`);
        }
        assignOption(options, key, value);
        i += 1;
      } else {
        throw new UsageError(`Unexpected argument: ${arg}`);
      }
    }
    i += 1;
  }

  return options;
}

function assignOption(options, key, value) {
  switch (key) {
    case 'input':
    case 'output':
    case 'poster':
    case 'camera':
    case 'taps':
    case 'take':
    case 'layout':
      options[key] = value;
      break;
    case 'start':
    case 'end':
    case 'hold':
      options[key] = parseNumber(key, value);
      break;
    default:
      throw new UsageError(`Unknown option --${key}`);
  }
}

function parseNumber(name, raw) {
  if (raw === '' || raw === null || raw === undefined) {
    throw new UsageError(`--${name} is required`);
  }
  if (typeof raw === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)) {
    throw new UsageError(
      `--${name} must be a finite number, got ${JSON.stringify(raw)}`,
    );
  }
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    throw new UsageError(`--${name} must be a finite number`);
  }
  return n;
}

function fmtNum(n) {
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 1e6) / 1e6;
  return String(rounded);
}

export function applyCameraEasing(easing, u) {
  const x = Math.max(0, Math.min(1, u));
  switch (easing) {
    case 'linear':
      return x;
    case 'ease-in':
      return x * x;
    case 'ease-out':
      return 1 - (1 - x) * (1 - x);
    case 'ease-in-out':
      return x * x * (3 - 2 * x);
    case 'smootherstep':
      // Quintic 6u^5-15u^4+10u^3; zero velocity and acceleration at endpoints.
      return x * x * x * ((6 * x - 15) * x + 10);
    default:
      throw new UsageError(
        `Unknown camera easing ${JSON.stringify(easing)}; expected ${CAMERA_EASINGS.join(', ')}`,
      );
  }
}

export function easingFfmpegExpr(uExpr, easing) {
  switch (easing) {
    case 'linear':
      return `(${uExpr})`;
    case 'ease-in':
      return `((${uExpr})*(${uExpr}))`;
    case 'ease-out':
      return `(1-(1-(${uExpr}))*(1-(${uExpr})))`;
    case 'ease-in-out':
      return `((${uExpr})*(${uExpr})*(3-2*(${uExpr})))`;
    case 'smootherstep':
      return `((${uExpr})*(${uExpr})*(${uExpr})*((6*(${uExpr})-15)*(${uExpr})+10))`;
    default:
      throw new UsageError(
        `Unknown camera easing ${JSON.stringify(easing)}; expected ${CAMERA_EASINGS.join(', ')}`,
      );
  }
}

function parseKeyframeEasing(kf, index) {
  if (!Object.prototype.hasOwnProperty.call(kf, 'easing')) {
    return DEFAULT_CAMERA_EASING;
  }
  const { easing } = kf;
  if (typeof easing !== 'string' || !CAMERA_EASINGS.includes(easing)) {
    throw new UsageError(
      `--camera keyframes[${index}].easing must be one of ${CAMERA_EASINGS.join(', ')}; got ${JSON.stringify(easing)}`,
    );
  }
  return easing;
}

export function validateCameraKeyframes(keyframes) {
  if (!Array.isArray(keyframes) || keyframes.length < 1) {
    throw new UsageError('--camera keyframes must be a non-empty array');
  }
  const normalized = [];
  for (let i = 0; i < keyframes.length; i += 1) {
    const kf = keyframes[i];
    if (!kf || typeof kf !== 'object') {
      throw new UsageError(`--camera keyframes[${i}] must be an object`);
    }
    const { at, y } = kf;
    if (
      typeof at !== 'number' ||
      typeof y !== 'number' ||
      !Number.isFinite(at) ||
      !Number.isFinite(y)
    ) {
      throw new UsageError(
        `--camera keyframes[${i}] at/y must be finite numbers`,
      );
    }
    if (at < 0) {
      throw new UsageError(
        `--camera keyframes[${i}].at must be >= 0, got ${at}`,
      );
    }
    if (y < 0) {
      throw new UsageError(`--camera keyframes[${i}].y must be >= 0, got ${y}`);
    }
    if (i > 0 && at <= normalized[i - 1].at) {
      throw new UsageError(
        `--camera keyframes[${i}].at must be strictly increasing`,
      );
    }
    normalized.push({
      at,
      y,
      easing: parseKeyframeEasing(kf, i),
    });
  }
  return normalized;
}

export function interpolateCameraY(t, keyframes) {
  if (!keyframes.length) return 0;
  if (t <= keyframes[0].at) return keyframes[0].y;
  const last = keyframes[keyframes.length - 1];
  if (t >= last.at) return last.y;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (t <= b.at) {
      if (a.y === b.y || b.at === a.at) return a.y;
      const easing = a.easing || DEFAULT_CAMERA_EASING;
      return (
        a.y +
        (b.y - a.y) * applyCameraEasing(easing, (t - a.at) / (b.at - a.at))
      );
    }
  }
  return last.y;
}

export function maxCameraDesignY(layout) {
  const travel = layout.displayH - layout.visibleApertureH;
  if (travel <= 0) return 0;
  return travel / layout.outputScale;
}

export function clampCameraKeyframes(keyframes, maxY) {
  let clamped = false;
  const next = keyframes.map((kf) => {
    if (kf.y > maxY) {
      clamped = true;
      return { at: kf.at, y: maxY, easing: kf.easing };
    }
    return { at: kf.at, y: kf.y, easing: kf.easing };
  });
  return { keyframes: next, clamped };
}

function requireCameraNumber(value, label, { min, minExclusive } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UsageError(
      `--camera ${label} must be a finite number, got ${JSON.stringify(value)}`,
    );
  }
  if (minExclusive !== undefined && value <= minExclusive) {
    throw new UsageError(
      `--camera ${label} must be > ${minExclusive}, got ${value}`,
    );
  }
  if (min !== undefined && value < min) {
    throw new UsageError(`--camera ${label} must be >= ${min}, got ${value}`);
  }
  return value;
}

function parseMoveEasing(move, index) {
  if (!Object.prototype.hasOwnProperty.call(move, 'easing')) {
    return DEFAULT_CAMERA_EASING;
  }
  const { easing } = move;
  if (typeof easing !== 'string' || !CAMERA_EASINGS.includes(easing)) {
    throw new UsageError(
      `--camera moves[${index}].easing must be one of ${CAMERA_EASINGS.join(', ')}; got ${JSON.stringify(easing)}`,
    );
  }
  return easing;
}

function parseMoveArrival(move, index) {
  const hasBefore = Object.prototype.hasOwnProperty.call(move, 'arriveBefore');
  const hasAfter = Object.prototype.hasOwnProperty.call(move, 'arriveAfter');
  if (hasBefore && hasAfter) {
    throw new UsageError(
      `--camera moves[${index}] must not set both arriveBefore and arriveAfter`,
    );
  }
  if (!hasBefore && !hasAfter) {
    throw new UsageError(
      `--camera moves[${index}] must set exactly one of arriveBefore or arriveAfter`,
    );
  }
  if (hasAfter) {
    return {
      arriveAfter: requireCameraNumber(
        move.arriveAfter,
        `moves[${index}].arriveAfter`,
        { min: 0 },
      ),
    };
  }
  return {
    arriveBefore: requireCameraNumber(
      move.arriveBefore,
      `moves[${index}].arriveBefore`,
      { min: 0 },
    ),
  };
}

function validateCameraMoves(moves) {
  if (!Array.isArray(moves) || moves.length < 1) {
    throw new UsageError('--camera moves must be a non-empty array');
  }
  return moves.map((move, index) => {
    if (!move || typeof move !== 'object' || Array.isArray(move)) {
      throw new UsageError(`--camera moves[${index}] must be an object`);
    }
    const { marker } = move;
    if (typeof marker !== 'string' || !marker) {
      throw new UsageError(
        `--camera moves[${index}].marker must be a non-empty string`,
      );
    }
    return {
      marker,
      ...parseMoveArrival(move, index),
      duration: requireCameraNumber(move.duration, `moves[${index}].duration`, {
        minExclusive: 0,
      }),
      y: requireCameraNumber(move.y, `moves[${index}].y`, { min: 0 }),
      easing: parseMoveEasing(move, index),
    };
  });
}

export function validateCameraConfig(raw) {
  if (Array.isArray(raw)) {
    return {
      mode: 'keyframes',
      offsetUnits: 'designPx',
      keyframes: validateCameraKeyframes(raw),
    };
  }
  if (!raw || typeof raw !== 'object') {
    throw new UsageError('--camera JSON must be an object or a keyframe array');
  }
  if (raw.offsetUnits !== undefined && raw.offsetUnits !== 'designPx') {
    throw new UsageError('--camera offsetUnits must be designPx');
  }
  const hasKeyframes = Object.prototype.hasOwnProperty.call(raw, 'keyframes');
  const hasMoves = Object.prototype.hasOwnProperty.call(raw, 'moves');
  if (hasKeyframes && hasMoves) {
    throw new UsageError('--camera must not set both keyframes and moves');
  }
  if (hasMoves) {
    const initialY =
      raw.initialY === undefined
        ? 0
        : requireCameraNumber(raw.initialY, 'initialY', { min: 0 });
    return {
      mode: 'moves',
      offsetUnits: 'designPx',
      initialY,
      moves: validateCameraMoves(raw.moves),
    };
  }
  return {
    mode: 'keyframes',
    offsetUnits: 'designPx',
    keyframes: validateCameraKeyframes(raw.keyframes),
  };
}

function rethrowCameraUsage(error) {
  if (error instanceof UsageError) throw error;
  if (error && error.code === 'TAP_CONFIG') {
    throw new UsageError(error.message);
  }
  throw error;
}

function snapToCameraBoundary(value, boundary) {
  return Math.abs(value - boundary) <= CAMERA_BOUNDARY_EPS ? boundary : value;
}

function appendCameraKeyframe(keyframes, at, y, easing) {
  const last = keyframes[keyframes.length - 1];
  if (last && last.at === at) {
    last.y = y;
    last.easing = easing;
    return;
  }
  keyframes.push({ at, y, easing });
}

function keyframesFromResolvedMoves(initialY, resolvedMoves) {
  const keyframes = [];
  let currentY = initialY;
  appendCameraKeyframe(keyframes, 0, initialY, DEFAULT_CAMERA_EASING);
  for (const move of resolvedMoves) {
    appendCameraKeyframe(keyframes, move.start, currentY, move.easing);
    appendCameraKeyframe(keyframes, move.end, move.y, DEFAULT_CAMERA_EASING);
    currentY = move.y;
  }
  return validateCameraKeyframes(keyframes);
}

function resolveCameraMoves(config, { take, composeStart, inputSha256 }) {
  if (!take || typeof take !== 'object' || Array.isArray(take)) {
    throw new UsageError('--take is required when --camera uses moves');
  }
  const hash = takeRawHash(take);
  if (!hash) {
    throw new UsageError('--take is missing rawHash');
  }
  if (hash !== inputSha256) {
    throw new UsageError('--take rawHash does not match --input');
  }
  if (typeof composeStart !== 'number' || !Number.isFinite(composeStart)) {
    throw new UsageError('--start must be a finite number');
  }

  const resolvedMoves = [];
  for (let i = 0; i < config.moves.length; i += 1) {
    const move = config.moves[i];
    let markerRecord;
    try {
      markerRecord = findSceneMarker(take, move.marker);
    } catch (error) {
      rethrowCameraUsage(error);
    }
    let eventAt;
    try {
      eventAt = markerOutputTime(markerRecord, take, composeStart, 0);
    } catch (error) {
      rethrowCameraUsage(error);
    }
    const end = Object.prototype.hasOwnProperty.call(move, 'arriveAfter')
      ? eventAt + move.arriveAfter
      : eventAt - move.arriveBefore;
    // Snap only start=0 and previous.end; do not round event/start/end in general.
    let start = snapToCameraBoundary(end - move.duration, 0);
    if (start < 0) {
      const arrival = Object.prototype.hasOwnProperty.call(move, 'arriveAfter')
        ? `arriveAfter ${move.arriveAfter}`
        : `arriveBefore ${move.arriveBefore}`;
      throw new UsageError(
        `--camera moves[${i}] (${JSON.stringify(move.marker)}) starts at ${start}s, before the trimmed output (event ${eventAt}s, ${arrival}, duration ${move.duration}). Record a longer lead-in before the event; the compositor will not shift or freeze the video to hide this.`,
      );
    }
    const previous = resolvedMoves[i - 1];
    if (previous) {
      start = snapToCameraBoundary(start, previous.end);
      if (start < previous.start) {
        throw new UsageError(
          `--camera moves[${i}] (${JSON.stringify(move.marker)}) starts at ${start}s before previous move start ${previous.start}s`,
        );
      }
      if (start < previous.end) {
        throw new UsageError(
          `--camera moves[${i}] (${JSON.stringify(move.marker)}) overlaps previous move (start ${start}s < previous end ${previous.end}s)`,
        );
      }
    }
    const resolved = {
      marker: move.marker,
      duration: move.duration,
      y: move.y,
      easing: move.easing,
      eventAt,
      start,
      end,
    };
    if (Object.prototype.hasOwnProperty.call(move, 'arriveAfter')) {
      resolved.arriveAfter = move.arriveAfter;
    } else {
      resolved.arriveBefore = move.arriveBefore;
    }
    resolvedMoves.push(resolved);
  }

  return {
    initialY: config.initialY,
    moves: config.moves,
    resolvedMoves,
    requestedKeyframes: keyframesFromResolvedMoves(
      config.initialY,
      resolvedMoves,
    ),
  };
}

export function resolveCameraPlan(
  config,
  { take = null, composeStart, inputSha256, layout } = {},
) {
  const normalized =
    config && (config.mode === 'keyframes' || config.mode === 'moves')
      ? config
      : validateCameraConfig(config);
  let requestedKeyframes;
  let movesMeta = null;
  if (normalized.mode === 'moves') {
    const resolved = resolveCameraMoves(normalized, {
      take,
      composeStart,
      inputSha256,
    });
    requestedKeyframes = resolved.requestedKeyframes;
    movesMeta = {
      initialY: resolved.initialY,
      moves: resolved.moves,
      resolvedMoves: resolved.resolvedMoves,
    };
  } else {
    requestedKeyframes = normalized.keyframes;
  }
  const maxDesignY = maxCameraDesignY(layout);
  const clamped = clampCameraKeyframes(requestedKeyframes, maxDesignY);
  return {
    mode: normalized.mode,
    offsetUnits: 'designPx',
    ...movesMeta,
    keyframes: clamped.keyframes,
    requestedKeyframes,
    maxDesignY,
    clamped: clamped.clamped,
  };
}

function parseCameraFile(cameraPath) {
  const resolved = path.resolve(cameraPath);
  if (!fs.existsSync(resolved)) {
    throw new UsageError(`--camera not found: ${resolved}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    throw new UsageError(
      `--camera is not valid JSON: ${error instanceof Error ? error.message : error}`,
    );
  }
  return {
    path: resolved,
    config: validateCameraConfig(parsed),
  };
}

function readTakeFile(takePath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(takePath, 'utf8'));
  } catch (error) {
    throw new UsageError(
      `--take is not valid JSON: ${error instanceof Error ? error.message : error}`,
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UsageError('--take JSON must be an object');
  }
  return parsed;
}

export function cameraDesignYExpr(keyframes) {
  if (!keyframes.length) return '0';
  if (keyframes.length === 1) return fmtNum(keyframes[0].y);
  const t = 't';
  let expr = fmtNum(keyframes[keyframes.length - 1].y);
  for (let i = keyframes.length - 2; i >= 0; i -= 1) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    let segment;
    if (a.y === b.y) {
      segment = fmtNum(a.y);
    } else {
      const u = `clip((${t}-${fmtNum(a.at)})/${fmtNum(b.at - a.at)}\\,0\\,1)`;
      const s = easingFfmpegExpr(u, a.easing || DEFAULT_CAMERA_EASING);
      segment = `(${fmtNum(a.y)}+(${fmtNum(b.y)}-${fmtNum(a.y)})*${s})`;
    }
    expr = `if(lt(${t}\\,${fmtNum(b.at)})\\,${segment}\\,${expr})`;
  }
  expr = `if(lt(${t}\\,${fmtNum(keyframes[0].at)})\\,${fmtNum(keyframes[0].y)}\\,${expr})`;
  return expr;
}

export function cameraCropYExpr(camera, layout) {
  const maxCropY = layout.displayH - layout.visibleApertureH;
  if (!camera) return '0';
  const designY = cameraDesignYExpr(camera.keyframes);
  return `clip(round((${designY})*${layout.outputScale})\\,0\\,${maxCropY})`;
}

function evenFloor(n) {
  const v = Math.round(n);
  return v % 2 === 0 ? v : v - 1;
}

function escapeFilterExpr(expr) {
  return expr.replace(/,/g, '\\,');
}

/**
 * Binary coverage of a rounded rectangle in FFmpeg geq coordinates.
 * Returns 1 inside, 0 outside. Generate at 2x and downscale for edge AA.
 */
function roundedTopInsideExpr(w, h, r) {
  const width = Math.max(2, evenFloor(w));
  const height = Math.max(2, evenFloor(h));
  const x1 = width - 1;
  const y1 = height - 1;
  const radius = Math.max(
    1,
    Math.min(Math.round(r), Math.floor(width / 2), Math.floor(height / 2)),
  );
  const left = radius;
  const right = x1 - radius;
  const top = radius;
  return (
    `between(X,0,${x1})*between(Y,0,${y1})*` +
    `if(lt(X,${left})*lt(Y,${top}),` +
    `lte(hypot(X-${left},Y-${top}),${radius}),` +
    `if(gt(X,${right})*lt(Y,${top}),` +
    `lte(hypot(X-${right},Y-${top}),${radius}),` +
    `1))`
  );
}

function roundedRectInsideExpr(x0, y0, w, h, r) {
  const width = Math.max(2, evenFloor(w));
  const height = Math.max(2, evenFloor(h));
  const x1 = x0 + width - 1;
  const y1 = y0 + height - 1;
  const radius = Math.max(
    1,
    Math.min(Math.round(r), Math.floor(width / 2), Math.floor(height / 2)),
  );
  const left = x0 + radius;
  const right = x1 - radius;
  const top = y0 + radius;
  const bottom = y1 - radius;
  return (
    `between(X,${x0},${x1})*between(Y,${y0},${y1})*` +
    `if(lt(X,${left})*lt(Y,${top}),` +
    `lte(hypot(X-${left},Y-${top}),${radius}),` +
    `if(gt(X,${right})*lt(Y,${top}),` +
    `lte(hypot(X-${right},Y-${top}),${radius}),` +
    `if(lt(X,${left})*gt(Y,${bottom}),` +
    `lte(hypot(X-${left},Y-${bottom}),${radius}),` +
    `if(gt(X,${right})*gt(Y,${bottom}),` +
    `lte(hypot(X-${right},Y-${bottom}),${radius}),` +
    `1))))`
  );
}

function gradientExpr(layout, channel) {
  const top = layout.gradient.top[channel];
  const bottom = layout.gradient.bottom[channel];
  return `${top}+(${bottom}-${top})*(Y/(H-1))`;
}

export function buildLayout(preset, srcW, srcH) {
  const { design, nativeLogical, expectedRaw, outputScale, stillOversample } =
    preset;
  const designDisplayH = Math.round(
    (design.screen.width * nativeLogical.height) / nativeLogical.width,
  );
  const designPhoneH = designDisplayH + design.body.bezel * 2;
  const designStrokeH = designPhoneH + design.outerStroke.thickness * 2;
  const designDisplayX = design.body.x + design.body.bezel;
  const designDisplayY = design.body.y + design.body.bezel;
  const designApertureH = design.canvas.height - designDisplayY;
  const s = outputScale;
  return {
    outputScale: s,
    canvasW: design.canvas.width * s,
    canvasH: design.canvas.height * s,
    nativeLogical: { ...nativeLogical },
    expectedRaw: { ...expectedRaw },
    srcW,
    srcH,
    design: {
      canvas: { ...design.canvas },
      body: {
        x: design.body.x,
        y: design.body.y,
        width: design.body.width,
        height: designPhoneH,
        radius: design.body.radius,
        bezel: design.body.bezel,
      },
      screen: {
        x: designDisplayX,
        y: designDisplayY,
        width: design.screen.width,
        height: designDisplayH,
        radius: design.screen.radius,
      },
      visibleAperture: {
        x: designDisplayX,
        y: designDisplayY,
        width: design.screen.width,
        height: designApertureH,
      },
      outerStroke: {
        x: design.outerStroke.x,
        y: design.outerStroke.y,
        width: design.outerStroke.width,
        height: designStrokeH,
        radius: design.outerStroke.radius,
        thickness: design.outerStroke.thickness,
        opacity: design.outerStroke.opacity,
      },
    },
    displayW: design.screen.width * s,
    displayH: designDisplayH * s,
    displayX: designDisplayX * s,
    displayY: designDisplayY * s,
    visibleApertureW: design.screen.width * s,
    visibleApertureH: designApertureH * s,
    innerRadius: design.screen.radius * s,
    phoneW: design.body.width * s,
    phoneH: designPhoneH * s,
    phoneX: design.body.x * s,
    phoneY: design.body.y * s,
    outerRadius: design.body.radius * s,
    bezel: design.body.bezel * s,
    stroke: {
      x: design.outerStroke.x * s,
      y: design.outerStroke.y * s,
      width: design.outerStroke.width * s,
      height: designStrokeH * s,
      radius: design.outerStroke.radius * s,
      thickness: design.outerStroke.thickness * s,
      opacity: design.outerStroke.opacity,
      color: { ...design.outerStroke.color },
    },
    gradient: {
      direction: preset.gradient.direction,
      topHex: preset.gradient.topHex,
      bottomHex: preset.gradient.bottomHex,
      top: { ...preset.gradient.top },
      bottom: { ...preset.gradient.bottom },
    },
    stillOversample,
    scale: (design.screen.width * s) / srcW,
  };
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on('data', (chunk) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderrChunks.push(chunk);
    });
    child.on('error', (error) => {
      reject(
        commandError(`Failed to spawn ${bin}: ${error.message}`, {
          code: null,
          stdout: '',
          stderr: error.message,
          args,
        }),
      );
    });
    child.on('close', (code) => {
      const result = {
        code,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        args,
      };
      if (code !== 0) {
        reject(
          commandError(
            `${bin} exited ${code}\n${result.stderr.trim() || result.stdout.trim()}`,
            result,
          ),
        );
        return;
      }
      resolve(result);
    });
  });
}

async function sha256File(filePath) {
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function probe(filePath) {
  const { stdout } = await run(ffprobeBin(), [
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

function videoStream(probeJson) {
  return (
    (probeJson.streams || []).find((stream) => stream.codec_type === 'video') ||
    null
  );
}

function audioStreamCount(probeJson) {
  return (probeJson.streams || []).filter(
    (stream) => stream.codec_type === 'audio',
  ).length;
}

function summarizeProbe(probeJson) {
  const video = videoStream(probeJson);
  return {
    format: {
      filename: probeJson.format?.filename ?? null,
      duration: probeJson.format?.duration ?? null,
      size: probeJson.format?.size ?? null,
      bitRate: probeJson.format?.bit_rate ?? null,
      formatName: probeJson.format?.format_name ?? null,
    },
    video: video
      ? {
          codecName: video.codec_name,
          width: video.width,
          height: video.height,
          pixFmt: video.pix_fmt,
          avgFrameRate: video.avg_frame_rate,
          rFrameRate: video.r_frame_rate,
          nbFrames: video.nb_frames ?? null,
          duration: video.duration ?? null,
          startTime: video.start_time ?? null,
        }
      : null,
    audioStreamCount: audioStreamCount(probeJson),
  };
}

function validateTimes({ start, end, hold, durationSec }) {
  if (start < 0) {
    throw new UsageError(`--start must be >= 0, got ${start}`);
  }
  if (end < 0) {
    throw new UsageError(`--end must be >= 0, got ${end}`);
  }
  if (!(end > start)) {
    throw new UsageError(
      `--end must be greater than --start (inclusive stable frame after the motion), got start=${start} end=${end}`,
    );
  }
  if (hold < 0) {
    throw new UsageError(`--hold must be >= 0, got ${hold}`);
  }
  if (!Number.isFinite(hold)) {
    throw new UsageError('--hold must be a finite number');
  }
  if (durationSec !== null) {
    if (start >= durationSec) {
      throw new UsageError(
        `--start ${start} is beyond input duration ${durationSec}s`,
      );
    }
    if (end > durationSec + 1 / OUTPUT_FPS) {
      throw new UsageError(
        `--end ${end} is beyond input duration ${durationSec}s`,
      );
    }
  }
}

function manifestPathFor(outputPath) {
  const ext = path.extname(outputPath);
  if (!ext) return `${outputPath}.json`;
  return `${outputPath.slice(0, -ext.length)}.json`;
}

async function ffmpegVersionLine() {
  const { stdout } = await run(ffmpegBin(), ['-version']);
  return stdout.split('\n')[0] || '';
}

export async function generateBackground(layout, destPath) {
  const s = layout.stillOversample;
  const inBody = escapeFilterExpr(
    roundedRectInsideExpr(
      layout.phoneX * s,
      layout.phoneY * s,
      layout.phoneW * s,
      layout.phoneH * s,
      layout.outerRadius * s,
    ),
  );
  const inStroke = escapeFilterExpr(
    roundedRectInsideExpr(
      layout.stroke.x * s,
      layout.stroke.y * s,
      layout.stroke.width * s,
      layout.stroke.height * s,
      layout.stroke.radius * s,
    ),
  );
  const r = escapeFilterExpr(gradientExpr(layout, 'r'));
  const g = escapeFilterExpr(gradientExpr(layout, 'g'));
  const b = escapeFilterExpr(gradientExpr(layout, 'b'));
  const strokeKeep = `1-(${inStroke})*${layout.stroke.opacity}`;
  // Opaque black body; 20% black ring over the vertical gradient; 2x downsample AA.
  const vf = [
    'format=gbrp',
    `geq=r=(1-(${inBody}))*(${strokeKeep})*(${r}):g=(1-(${inBody}))*(${strokeKeep})*(${g}):b=(1-(${inBody}))*(${strokeKeep})*(${b})`,
    `scale=${layout.canvasW}:${layout.canvasH}:flags=bilinear`,
    'format=rgb24',
  ].join(',');

  await run(ffmpegBin(), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${layout.canvasW * s}x${layout.canvasH * s}:d=1:r=1`,
    '-vf',
    vf,
    '-frames:v',
    '1',
    destPath,
  ]);
}

async function generateDisplayMask(layout, destPath) {
  const s = layout.stillOversample;
  const inside = escapeFilterExpr(
    roundedTopInsideExpr(
      layout.visibleApertureW * s,
      layout.visibleApertureH * s,
      layout.innerRadius * s,
    ),
  );
  const vf = [
    'format=gray',
    `geq=lum=255*(${inside})`,
    `scale=${layout.visibleApertureW}:${layout.visibleApertureH}:flags=bilinear`,
    'format=gray',
  ].join(',');

  await run(ffmpegBin(), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${layout.visibleApertureW * s}x${layout.visibleApertureH * s}:d=1:r=1`,
    '-vf',
    vf,
    '-frames:v',
    '1',
    destPath,
  ]);
}

export function timingPlan({ start, end, hold }) {
  // Inclusive [start, end]: keep the final stable frame at --end.
  const contentFrames = Math.round((end - start) * OUTPUT_FPS) + 1;
  const holdFrames = Math.round(hold * OUTPUT_FPS);
  const outputFrames = contentFrames + holdFrames;
  // Ceil onto the 30fps grid after fps+setpts=N/FR/TB. The epsilon only
  // absorbs float error (1.2*30 must stay 36), not a timing fudge.
  const startFrame = Math.ceil(start * OUTPUT_FPS - 1e-9);
  const endFrameExclusive = startFrame + contentFrames;
  return {
    contentFrames,
    holdFrames,
    outputFrames,
    contentDuration: contentFrames / OUTPUT_FPS,
    outputDuration: outputFrames / OUTPUT_FPS,
    trimEndExclusive: start + contentFrames / OUTPUT_FPS,
    startFrame,
    endFrameExclusive,
  };
}

export function sourceNormalizeFilters({
  startFrame,
  endFrameExclusive,
  holdFrames,
}) {
  // fps on the original timeline first so sparse VFR gaps keep the previous
  // encoded frame. Trim by frame index after N/FR/TB so start/end rounding
  // is exact. Clone through endFrameExclusive so a hold after the last
  // encoded packet still fills the requested inclusive window. Pass the EOF
  // frame so a final off-grid VFR update is not replaced by the previous frame.
  const parts = [
    `fps=${OUTPUT_FPS}:eof_action=pass`,
    `setpts=N/${OUTPUT_FPS}/TB`,
    `tpad=stop_mode=clone:stop=${endFrameExclusive}`,
    `trim=start_frame=${startFrame}:end_frame=${endFrameExclusive}`,
    'setpts=PTS-STARTPTS',
  ];
  if (holdFrames > 0) {
    parts.push(`tpad=stop_mode=clone:stop=${holdFrames}`);
  }
  return parts;
}

function buildScaleCropFitted(layout, cropYExpr) {
  return [
    `scale=${layout.displayW}:${layout.displayH}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos`,
    `pad=${layout.displayW}:${layout.displayH}:(ow-iw)/2:(oh-ih)/2:black`,
    'format=gbrp',
    `crop=w=${layout.visibleApertureW}:h=${layout.visibleApertureH}:x=0:y=${cropYExpr}`,
    'format=rgba[fitted]',
  ];
}

export function buildTapOverlayChains(tapPlan) {
  const chains = [];
  if (!tapPlan?.active || !tapPlan.events?.length) {
    return chains;
  }
  const style = tapPlan.config.style;
  const events = tapPlan.events.filter(
    (event) => event.at + event.duration > 0,
  );
  let prev = 'clip0';
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const size = tapSpriteSize(event.radiusSrc);
    const geq = tapSpriteGeq({
      radiusSrc: event.radiusSrc,
      duration: event.duration,
      fill: {
        r: style.fill.r,
        g: style.fill.g,
        b: style.fill.b,
        opacity: style.opacity,
      },
      ring: {
        r: style.ring.r,
        g: style.ring.g,
        b: style.ring.b,
        opacity: style.ringOpacity,
      },
      size,
    });
    const spr = `tap${i}s`;
    const aligned = `tap${i}a`;
    const next = i === events.length - 1 ? 'tapped' : `clip${i + 1}`;
    chains.push(
      `color=c=black@0:s=${size}x${size}:d=${fmtNum(event.duration)}:r=${OUTPUT_FPS},format=rgba,${geq}[${spr}]`,
    );
    let overlayIn = spr;
    if (event.at > 0) {
      chains.push(
        `[${spr}]tpad=start_duration=${fmtNum(event.at)}:start_mode=add:color=0x00000000[${aligned}]`,
      );
      overlayIn = aligned;
    } else if (event.at < 0) {
      chains.push(
        `[${spr}]trim=start=${fmtNum(-event.at)},setpts=PTS-STARTPTS[${aligned}]`,
      );
      overlayIn = aligned;
    }
    const ox = Math.round(event.sourceX - size / 2);
    const oy = Math.round(event.sourceY - size / 2);
    chains.push(
      `[${prev}][${overlayIn}]overlay=x=${ox}:y=${oy}:format=auto:alpha=straight:eof_action=pass:repeatlast=0[${next}]`,
    );
    prev = next;
  }
  return chains;
}

function buildFilterComplex(
  layout,
  {
    startFrame,
    endFrameExclusive,
    holdFrames,
    outputFrames,
    cropYExpr,
    tapPlan,
  },
) {
  const clipParts = [
    `[0:v]${sourceNormalizeFilters({
      startFrame,
      endFrameExclusive,
      holdFrames,
    }).join(',')}`,
  ];
  const scaleCrop = buildScaleCropFitted(layout, cropYExpr);
  const tapChains = buildTapOverlayChains(tapPlan);
  const chains = [];
  if (tapChains.length > 0) {
    clipParts.push('format=rgba[clip0]');
    chains.push(clipParts.join(','));
    chains.push(...tapChains);
    chains.push(`[tapped]${scaleCrop.join(',')}`);
  } else {
    clipParts.push(...scaleCrop);
    chains.push(clipParts.join(','));
  }

  const merge = '[fitted][2:v]alphamerge[phone]';
  const overlay = [
    `[1:v]format=rgb24,loop=loop=-1:size=1:start=0[bgl]`,
    `[bgl][phone]overlay=${layout.displayX}:${layout.displayY}:format=rgb:repeatlast=1`,
    `fps=${OUTPUT_FPS}`,
    `trim=end_frame=${outputFrames}`,
    'setpts=PTS-STARTPTS',
    'setsar=1',
    'format=yuv420p[out]',
  ].join(',');

  return [...chains, merge, overlay].join(';');
}

async function encodeComposition({
  inputPath,
  outputPath,
  layout,
  startFrame,
  endFrameExclusive,
  holdFrames,
  outputFrames,
  bgPath,
  maskPath,
  cropYExpr,
  tapPlan,
}) {
  const filterComplex = buildFilterComplex(layout, {
    startFrame,
    endFrameExclusive,
    holdFrames,
    outputFrames,
    cropYExpr,
    tapPlan,
  });
  await run(ffmpegBin(), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-i',
    inputPath,
    '-framerate',
    String(OUTPUT_FPS),
    '-i',
    bgPath,
    '-framerate',
    String(OUTPUT_FPS),
    '-i',
    maskPath,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    PRESET,
    '-crf',
    String(CRF),
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-bf',
    '0',
    '-x264-params',
    'rc-lookahead=0:scenecut=0',
    '-r',
    String(OUTPUT_FPS),
    '-fps_mode',
    'cfr',
    '-frames:v',
    String(outputFrames),
    '-movflags',
    '+faststart',
    '-tag:v',
    'avc1',
    outputPath,
  ]);
}

async function extractPoster(outputPath, posterPath) {
  await run(ffmpegBin(), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-i',
    outputPath,
    '-an',
    '-update',
    '1',
    posterPath,
  ]);
}

function assertOutputProbe(
  outputProbe,
  { outputDuration, outputFrames, hold, canvasW, canvasH },
) {
  const video = videoStream(outputProbe);
  if (!video) {
    throw new Error('Composed output has no video stream');
  }
  if (video.width !== canvasW || video.height !== canvasH) {
    throw new Error(
      `Expected ${canvasW}x${canvasH}, got ${video.width}x${video.height}`,
    );
  }
  if (video.pix_fmt && video.pix_fmt !== 'yuv420p') {
    throw new Error(`Expected yuv420p, got ${video.pix_fmt}`);
  }
  if (audioStreamCount(outputProbe) !== 0) {
    throw new Error('Composed output must have no audio');
  }
  const duration = Number(outputProbe.format?.duration);
  if (
    !Number.isFinite(duration) ||
    Math.abs(duration - outputDuration) > 1 / OUTPUT_FPS + 0.01
  ) {
    throw new Error(
      `Output duration ${duration}s is not ${outputDuration}s (hold ${hold})`,
    );
  }
  const nbFrames = Number(video.nb_frames);
  if (Number.isFinite(nbFrames) && nbFrames !== outputFrames) {
    throw new Error(`Output frame count ${nbFrames} is not ${outputFrames}`);
  }
}

async function compose(options) {
  if (!options.input) throw new UsageError('--input is required');
  if (!options.output) throw new UsageError('--output is required');
  if (typeof options.start !== 'number') {
    throw new UsageError('--start is required');
  }
  if (typeof options.end !== 'number') {
    throw new UsageError('--end is required');
  }

  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  const posterPath = options.poster ? path.resolve(options.poster) : null;
  const cameraPath = options.camera ? path.resolve(options.camera) : null;
  const tapsPath = options.taps ? path.resolve(options.taps) : null;
  const takePath = options.take ? path.resolve(options.take) : null;
  const layoutPath = path.resolve(options.layout || DEFAULT_LAYOUT_PATH);
  const hold = options.hold;
  const start = options.start;
  const end = options.end;
  const manifestPath = manifestPathFor(outputPath);

  if (cameraPath && !fs.existsSync(cameraPath)) {
    throw new UsageError(`--camera not found: ${cameraPath}`);
  }
  if (tapsPath && !fs.existsSync(tapsPath)) {
    throw new UsageError(`--taps not found: ${tapsPath}`);
  }
  if (takePath && !fs.existsSync(takePath)) {
    throw new UsageError(`--take not found: ${takePath}`);
  }

  if (inputPath === outputPath) {
    throw new UsageError(
      `--input and --output resolve to the same path: ${inputPath}`,
    );
  }
  if (cameraPath === manifestPath) {
    throw new UsageError(
      '--camera must use a different path from output metadata',
    );
  }
  if (tapsPath === manifestPath || tapsPath === outputPath) {
    throw new UsageError(
      '--taps must use a different path from output video/metadata',
    );
  }
  if (takePath === manifestPath || takePath === outputPath) {
    throw new UsageError(
      '--take must use a different path from output video/metadata',
    );
  }
  if (
    layoutPath === outputPath ||
    layoutPath === manifestPath ||
    (posterPath && layoutPath === posterPath)
  ) {
    throw new UsageError(
      '--layout must use a different path from output video/poster/metadata',
    );
  }

  if (!fs.existsSync(inputPath)) {
    throw new UsageError(`Input not found: ${inputPath}`);
  }

  const inputProbe = await probe(inputPath);
  const inputVideo = videoStream(inputProbe);
  if (!inputVideo?.width || !inputVideo?.height) {
    throw new UsageError(
      `Input has no video stream with dimensions: ${inputPath}`,
    );
  }
  const durationSec = Number(inputProbe.format?.duration);
  validateTimes({
    start,
    end,
    hold,
    durationSec: Number.isFinite(durationSec) ? durationSec : null,
  });

  let composePreset;
  try {
    composePreset = loadLayoutConfig(layoutPath);
  } catch (error) {
    if (error && error.code === 'LAYOUT_CONFIG') {
      throw new UsageError(error.message);
    }
    throw error;
  }
  const layoutSha256 = await sha256File(layoutPath);
  const layout = buildLayout(
    composePreset,
    inputVideo.width,
    inputVideo.height,
  );
  const cameraFile = cameraPath ? parseCameraFile(cameraPath) : null;
  const timing = timingPlan({ start, end, hold });
  const inputSha256 = await sha256File(inputPath);
  const versionLine = await ffmpegVersionLine();

  let tapsConfig = null;
  if (tapsPath) {
    try {
      tapsConfig = loadTapsConfig(tapsPath);
    } catch (error) {
      if (error && error.code === 'TAP_CONFIG') {
        throw new UsageError(error.message);
      }
      throw error;
    }
  }

  const tapsActive = Boolean(tapsConfig) && isTapOverlayActive(tapsConfig);
  const cameraNeedsTake = cameraFile?.config.mode === 'moves';

  let take = null;
  if ((cameraNeedsTake || tapsActive) && takePath) {
    take = readTakeFile(takePath);
  }

  let camera = null;
  if (cameraFile) {
    camera = {
      path: cameraFile.path,
      ...resolveCameraPlan(cameraFile.config, {
        take,
        composeStart: start,
        inputSha256,
        layout,
      }),
    };
  }
  const cropYExpr = cameraCropYExpr(camera, layout);

  let tapPlan = { active: false, events: [] };
  if (tapsConfig) {
    try {
      if (isTapOverlayActive(tapsConfig)) {
        tapPlan = resolveTapPlan(tapsConfig, {
          take,
          composeStart: start,
          srcW: inputVideo.width,
          srcH: inputVideo.height,
          inputSha256,
        });
        tapPlan.path = tapsPath;
        tapPlan.takePath = takePath;
      } else {
        tapPlan = {
          active: false,
          config: tapsConfig,
          events: [],
          requestedEvents: tapsConfig.events,
          path: tapsPath,
          takePath,
        };
      }
    } catch (error) {
      if (error && error.code === 'TAP_CONFIG') {
        throw new UsageError(error.message);
      }
      throw error;
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (posterPath) {
    fs.mkdirSync(path.dirname(posterPath), { recursive: true });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-demo-compose-'));
  const bgPath = path.join(tmpDir, 'background.png');
  const maskPath = path.join(tmpDir, 'display-mask.png');

  try {
    await generateBackground(layout, bgPath);
    await generateDisplayMask(layout, maskPath);
    await encodeComposition({
      inputPath,
      outputPath,
      layout,
      startFrame: timing.startFrame,
      endFrameExclusive: timing.endFrameExclusive,
      holdFrames: timing.holdFrames,
      outputFrames: timing.outputFrames,
      bgPath,
      maskPath,
      cropYExpr,
      tapPlan,
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const outputProbe = await probe(outputPath);
  assertOutputProbe(outputProbe, {
    outputDuration: timing.outputDuration,
    outputFrames: timing.outputFrames,
    hold,
    canvasW: layout.canvasW,
    canvasH: layout.canvasH,
  });

  if (posterPath) {
    await extractPoster(outputPath, posterPath);
    if (!fs.existsSync(posterPath) || fs.statSync(posterPath).size < 100) {
      throw new Error(`Poster was not written: ${posterPath}`);
    }
  }

  const manifest = {
    tool: TOOL_NAME,
    version: TOOL_VERSION,
    createdAt: new Date().toISOString(),
    input: {
      path: inputPath,
      sha256: inputSha256,
      ffprobe: summarizeProbe(inputProbe),
    },
    output: {
      path: outputPath,
      ffprobe: summarizeProbe(outputProbe),
    },
    poster: posterPath
      ? {
          path: posterPath,
        }
      : null,
    trim: {
      start,
      end,
      inclusive: true,
      trimEndExclusive: timing.trimEndExclusive,
      startFrame: timing.startFrame,
      endFrameExclusive: timing.endFrameExclusive,
      contentDuration: timing.contentDuration,
      contentFrames: timing.contentFrames,
    },
    hold,
    holdFrames: timing.holdFrames,
    outputDuration: timing.outputDuration,
    outputFrames: timing.outputFrames,
    settings: {
      layout: {
        path: layoutPath,
        sha256: layoutSha256,
        preset: composePreset,
      },
      outputScale: layout.outputScale,
      design: layout.design,
      canvas: { width: layout.canvasW, height: layout.canvasH },
      nativeLogical: layout.nativeLogical,
      expectedRaw: layout.expectedRaw,
      phone: {
        x: layout.phoneX,
        y: layout.phoneY,
        width: layout.phoneW,
        height: layout.phoneH,
        radius: layout.outerRadius,
        bezel: layout.bezel,
      },
      screen: {
        x: layout.displayX,
        y: layout.displayY,
        width: layout.displayW,
        height: layout.displayH,
        radius: layout.innerRadius,
      },
      visibleAperture: {
        x: layout.displayX,
        y: layout.displayY,
        width: layout.visibleApertureW,
        height: layout.visibleApertureH,
      },
      outerStroke: layout.stroke,
      gradient: layout.gradient,
      camera: camera
        ? {
            path: camera.path,
            offsetUnits: camera.offsetUnits,
            ...(camera.mode === 'moves'
              ? {
                  takePath,
                  initialY: camera.initialY,
                  moves: camera.moves,
                  resolvedMoves: camera.resolvedMoves,
                }
              : {}),
            keyframes: camera.keyframes,
            requestedKeyframes: camera.requestedKeyframes,
            maxDesignY: camera.maxDesignY,
            clamped: camera.clamped,
            cropYExpr,
          }
        : {
            path: null,
            offsetUnits: 'designPx',
            keyframes: [{ at: 0, y: 0 }],
            maxDesignY: maxCameraDesignY(layout),
            clamped: false,
            static: true,
          },
      taps: {
        path: tapPlan.path || null,
        takePath: tapPlan.takePath || null,
        active: Boolean(tapPlan.active),
        coordinateSpace: tapPlan.config?.coordinateSpace || 'device',
        style: tapPlan.config
          ? {
              radius: tapPlan.config.style.radius,
              color: tapPlan.config.style.color,
              opacity: tapPlan.config.style.opacity,
              ringColor: tapPlan.config.style.ringColor,
              ringOpacity: tapPlan.config.style.ringOpacity,
            }
          : null,
        requestedEvents:
          tapPlan.requestedEvents || tapPlan.config?.events || [],
        events: tapPlan.events,
      },
      fps: OUTPUT_FPS,
      pixelFormat: 'yuv420p',
      videoCodec: 'libx264',
      audio: false,
      faststart: true,
      crf: CRF,
      preset: PRESET,
      bFrames: 0,
      source: { width: layout.srcW, height: layout.srcH, scale: layout.scale },
      ffmpeg: ffmpegBin(),
      ffprobe: ffprobeBin(),
      ffmpegVersion: versionLine,
    },
  };

  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${manifestPath}`);
  if (posterPath) {
    console.log(`Wrote ${posterPath}`);
  }
  const outDuration = outputProbe.format?.duration;
  const outVideo = videoStream(outputProbe);
  console.log(
    `${outVideo.width}x${outVideo.height} ${outVideo.pix_fmt} ${outVideo.avg_frame_rate} duration=${outDuration}s audio=${audioStreamCount(outputProbe)} hold=${hold}s`,
  );

  return { outputPath, manifestPath, posterPath, manifest };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      printUsage();
      process.exit(1);
    }
    throw error;
  }

  if (options.help) {
    printUsage();
    return;
  }

  try {
    await compose(options);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      process.exit(1);
    }
    console.error(error.message || error);
    process.exit(1);
  }
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  void main();
}
