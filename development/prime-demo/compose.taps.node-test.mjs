/* cspell:ignore setpts */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildTapOverlayChains } from './compose.mjs';
import {
  isSourceYVisible,
  isTapOverlayActive,
  loadTapsConfig,
  logicalToSourcePoint,
  markerOutputTime,
  resolveTapPlan,
  tapSpriteGeq,
  tapSpriteSize,
  validateTapsConfig,
} from './taps.mjs';

const SRC_W = 1178;
const SRC_H = 2556;
const LOGICAL_X = 28;
const LOGICAL_Y = 742;
const SOURCE_X = (LOGICAL_X * SRC_W) / 393;
const SOURCE_Y = (LOGICAL_Y * SRC_H) / 852;
const RECORDING_STARTED_MS = 1_000_000;
const RECEIVED_AT_MS = 1_003_000;
const COMPOSE_START = 1.5;
const OFFSET = 0.1;
const MARKER_AT = 1.6;
const SCENE = 'scene-a';
const RAW_HASH = 'abc123def4567890';

function baseStyle() {
  return {
    radius: 14,
    color: '#FFFFFF',
    opacity: 0.4,
    ringColor: '#A8B3AE',
    ringOpacity: 0.18,
  };
}

function markerTake(overrides = {}) {
  return {
    rawHash: RAW_HASH,
    matchedSceneKey: SCENE,
    host: { recordingStartedMs: RECORDING_STARTED_MS },
    markers: [
      {
        name: 'riskAcknowledged',
        sceneKey: SCENE,
        receivedAtMs: RECEIVED_AT_MS,
        extra: { point: { x: 40, y: 700 } },
      },
    ],
    ...overrides,
  };
}

function enabledEvent(extra = {}) {
  return {
    id: 'risk-checkbox',
    enabled: true,
    marker: 'riskAcknowledged',
    offset: 0,
    duration: 0.7,
    ...extra,
  };
}

test('toggles: omitted/disabled configs do not activate overlay', () => {
  assert.equal(isTapOverlayActive(null), false);
  assert.equal(
    isTapOverlayActive(
      validateTapsConfig({ enabled: false, events: [enabledEvent()] }),
    ),
    false,
  );
  assert.equal(
    isTapOverlayActive(
      validateTapsConfig({
        enabled: true,
        events: [{ ...enabledEvent(), enabled: false, at: 1 }],
      }),
    ),
    false,
  );
  assert.equal(
    isTapOverlayActive(
      validateTapsConfig({ enabled: true, events: [enabledEvent()] }),
    ),
    true,
  );
});

test('disabled events do not require take or marker', () => {
  const config = validateTapsConfig({
    enabled: true,
    events: [
      {
        id: 'off',
        enabled: false,
        duration: 0.7,
      },
    ],
  });
  const plan = resolveTapPlan(config, {
    composeStart: 0,
    srcW: SRC_W,
    srcH: SRC_H,
    inputSha256: RAW_HASH,
  });
  assert.equal(plan.active, false);
  assert.deepEqual(plan.events, []);
});

test('marker time is (received-started)/1000 - start + offset', () => {
  const marker = {
    receivedAtMs: RECEIVED_AT_MS,
  };
  const take = { host: { recordingStartedMs: RECORDING_STARTED_MS } };
  assert.equal(
    markerOutputTime(marker, take, COMPOSE_START, OFFSET),
    MARKER_AT,
  );
});

test('explicit x/y override measured extra.point', () => {
  const config = validateTapsConfig({
    enabled: true,
    style: baseStyle(),
    events: [enabledEvent({ x: LOGICAL_X, y: LOGICAL_Y })],
  });
  const plan = resolveTapPlan(config, {
    take: markerTake(),
    composeStart: COMPOSE_START,
    srcW: SRC_W,
    srcH: SRC_H,
    inputSha256: RAW_HASH,
  });
  assert.equal(
    plan.events[0].at,
    (RECEIVED_AT_MS - RECORDING_STARTED_MS) / 1000 - COMPOSE_START,
  );
  assert.equal(plan.events[0].logicalX, LOGICAL_X);
  assert.equal(plan.events[0].logicalY, LOGICAL_Y);
  assert.equal(plan.events[0].pointSource, 'explicit');
});

test('omitted x/y uses marker.extra.point', () => {
  const config = validateTapsConfig({
    enabled: true,
    style: baseStyle(),
    events: [enabledEvent()],
  });
  const plan = resolveTapPlan(config, {
    take: markerTake(),
    composeStart: 0,
    srcW: SRC_W,
    srcH: SRC_H,
    inputSha256: RAW_HASH,
  });
  assert.equal(plan.events[0].logicalX, 40);
  assert.equal(plan.events[0].logicalY, 700);
  assert.equal(plan.events[0].pointSource, 'marker.extra.point');
});

test('logical 393x852 maps to source with independent width/height scales', () => {
  const point = logicalToSourcePoint(
    LOGICAL_X,
    LOGICAL_Y,
    SRC_W,
    SRC_H,
    393,
    852,
  );
  assert.equal(point.x, SOURCE_X);
  assert.equal(point.y, SOURCE_Y);
  assert.equal(SOURCE_Y, 2226);
});

test('overlay sits on full recording so camera crop clips it', () => {
  const srcH = 200;
  const displayH = 100;
  const cropY = 80;
  const apertureH = 40;
  assert.equal(isSourceYVisible(150, cropY, apertureH, srcH, displayH), false);
  assert.equal(isSourceYVisible(170, cropY, apertureH, srcH, displayH), true);
  assert.equal(isSourceYVisible(50, cropY, apertureH, srcH, displayH), false);
});

test('missing, ambiguous, and wrong-source markers fail clearly', () => {
  const config = validateTapsConfig({
    enabled: true,
    events: [enabledEvent()],
  });
  const ctx = {
    composeStart: 0,
    srcW: SRC_W,
    srcH: SRC_H,
    inputSha256: RAW_HASH,
  };
  assert.throws(() => resolveTapPlan(config, ctx), /--take is required/);
  assert.throws(
    () =>
      resolveTapPlan(config, {
        ...ctx,
        take: markerTake({ rawHash: 'ffffffffffffffff' }),
      }),
    /rawHash does not match/,
  );
  assert.throws(
    () =>
      resolveTapPlan(config, {
        ...ctx,
        take: markerTake({
          markers: [],
        }),
      }),
    /No marker "riskAcknowledged"/,
  );
  assert.throws(
    () =>
      resolveTapPlan(config, {
        ...ctx,
        take: markerTake({
          markers: [
            {
              name: 'riskAcknowledged',
              sceneKey: SCENE,
              receivedAtMs: RECEIVED_AT_MS,
              extra: { point: { x: 1, y: 2 } },
            },
            {
              name: 'riskAcknowledged',
              sceneKey: SCENE,
              receivedAtMs: RECEIVED_AT_MS + 1,
              extra: { point: { x: 1, y: 2 } },
            },
          ],
        }),
      }),
    /Ambiguous marker "riskAcknowledged"/,
  );
  assert.throws(
    () =>
      resolveTapPlan(config, {
        ...ctx,
        take: markerTake({
          markers: [
            {
              name: 'riskAcknowledged',
              sceneKey: 'other-scene',
              receivedAtMs: RECEIVED_AT_MS,
              extra: { point: { x: 1, y: 2 } },
            },
          ],
        }),
      }),
    /No marker "riskAcknowledged"/,
  );
});

test('manual at is mutually exclusive with marker; live fixture omits x/y', () => {
  assert.throws(
    () =>
      validateTapsConfig({
        enabled: true,
        events: [
          {
            id: 'both',
            at: 1,
            marker: 'riskAcknowledged',
            duration: 0.7,
          },
        ],
      }),
    /must not set both at and marker/,
  );
  const live = loadTapsConfig(
    fileURLToPath(new URL('./fixtures/taps-signguard.json', import.meta.url)),
  );
  assert.equal(live.events[0].hasExplicitPoint, false);
  assert.equal(live.events[0].marker, 'riskAcknowledged');
});

test('top disabled config skips event validation and overlay', () => {
  const config = validateTapsConfig({
    enabled: false,
    coordinateSpace: 'device',
    events: [{ marker: 'missing-intentionally' }],
  });
  assert.equal(config.enabled, false);
  const plan = resolveTapPlan(config, {
    composeStart: 0,
    srcW: SRC_W,
    srcH: SRC_H,
    inputSha256: RAW_HASH,
  });
  assert.equal(plan.active, false);
  assert.equal(plan.requestedEvents.length, 1);
  assert.deepEqual(buildTapOverlayChains(plan), []);
});

test('resolved logical x/y must be within 0..393 / 0..852', () => {
  const config = validateTapsConfig({
    enabled: true,
    events: [enabledEvent({ x: 400, y: 10 })],
  });
  assert.throws(
    () =>
      resolveTapPlan(config, {
        take: markerTake(),
        composeStart: 0,
        srcW: SRC_W,
        srcH: SRC_H,
        inputSha256: RAW_HASH,
      }),
    /logical x\/y must be within 0\.\.393 \/ 0\.\.852/,
  );
});

test('pre-trim taps are trimmed or omitted, not restarted at 0', () => {
  const config = validateTapsConfig({
    enabled: true,
    style: baseStyle(),
    events: [
      { id: 'partial', enabled: true, at: -0.2, x: 28, y: 742, duration: 0.7 },
      { id: 'gone', enabled: true, at: -1, x: 28, y: 742, duration: 0.5 },
      { id: 'later', enabled: true, at: 0.2, x: 28, y: 742, duration: 0.7 },
    ],
  });
  const plan = resolveTapPlan(config, {
    composeStart: 0,
    srcW: SRC_W,
    srcH: SRC_H,
    inputSha256: RAW_HASH,
  });
  assert.equal(plan.requestedEvents.length, 3);
  assert.deepEqual(
    plan.events.map((event) => event.id),
    ['partial', 'later'],
  );
  const chains = buildTapOverlayChains(plan).join(';');
  assert.match(chains, /trim=start=0\.2/);
  assert.match(chains, /tpad=start_duration=0\.2/);
  assert.doesNotMatch(chains, /tap2s/);
});

test('tap sprite fades in, has a soft edge, and fades out', () => {
  const size = tapSpriteSize(8);
  const duration = 0.85;
  const frameCount = 26;
  const geq = tapSpriteGeq({
    radiusSrc: 8,
    duration,
    fill: { r: 255, g: 255, b: 255, opacity: 0.4 },
    ring: { r: 168, g: 179, b: 174, opacity: 0.18 },
    size,
  });
  const result = spawnSync(
    process.env.FFMPEG || 'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostdin',
      '-f',
      'lavfi',
      '-i',
      `color=c=black@0:s=${size}x${size}:d=${duration}:r=30`,
      '-vf',
      `format=rgba,${geq}`,
      '-frames:v',
      String(frameCount),
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      'pipe:1',
    ],
    { encoding: 'buffer' },
  );
  assert.equal(result.status, 0, result.stderr.toString());
  const bytes = result.stdout;
  const frameSize = size * size * 4;
  assert.equal(bytes.length, frameCount * frameSize);
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const at = (frame, x, y) => {
    const i = frame * frameSize + (y * size + x) * 4;
    return [bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]];
  };
  const first = at(0, cx, cy);
  const risen = at(4, cx, cy);
  const last = at(frameCount - 1, cx, cy);
  const corner = at(4, 0, 0);
  const edge = at(4, cx, Math.min(size - 1, cy + 8));
  assert.ok(first[3] < 25, `fade-in first alpha ${first[3]}`);
  assert.ok(
    risen[3] > first[3] + 30,
    `fade-in rose ${first[3]} -> ${risen[3]}`,
  );
  assert.ok(risen[3] > 40);
  assert.ok(last[3] < 20, `fade-out last alpha ${last[3]}`);
  assert.equal(corner[3], 0);
  assert.ok(Number.isFinite(risen[0]) && risen[0] <= 255);
  assert.ok(edge[3] > 8 && edge[3] < 230, `soft edge alpha ${edge[3]}`);
  assert.ok(
    edge[0] + edge[1] + edge[2] > 80,
    `no black fringe ${edge.slice(0, 3)}`,
  );
});

function overlayPlan(events) {
  return {
    active: true,
    config: validateTapsConfig({
      enabled: true,
      style: baseStyle(),
      events: events.map((event) => ({
        id: event.id,
        enabled: true,
        at: event.at,
        x: 196.5,
        y: 400,
        duration: event.duration,
      })),
    }),
    events: events.map((event) => ({
      id: event.id,
      at: event.at,
      duration: event.duration,
      sourceX: 32,
      sourceY: 32,
      radiusSrc: 8,
    })),
  };
}

function readCenter(rgb, frameIndex, width = 64) {
  const frameSize = width * width * 3;
  const i = frameIndex * frameSize + (32 * width + 32) * 3;
  return [rgb[i], rgb[i + 1], rgb[i + 2]];
}

function isLit(rgb, frameIndex) {
  const [r, g, b] = readCenter(rgb, frameIndex);
  return r + g + b > 40;
}

function encodeOverlay(events) {
  const plan = overlayPlan(events);
  const chains = buildTapOverlayChains(plan);
  assert.ok(
    chains.length > 0 ||
      events.every((event) => event.at + event.duration <= 0),
  );
  const filter = [`[0:v]format=rgba,setpts=N/30/TB[clip0]`, ...chains].join(
    ';',
  );
  const mapLabel = chains.length > 0 ? '[tapped]' : '[clip0]';
  const result = spawnSync(
    process.env.FFMPEG || 'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostdin',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=64x64:d=1.2:r=30',
      '-filter_complex',
      filter,
      '-map',
      mapLabel,
      '-frames:v',
      '36',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      'pipe:1',
    ],
    { encoding: 'buffer' },
  );
  assert.equal(result.status, 0, result.stderr.toString());
  assert.equal(result.stdout.length, 36 * 64 * 64 * 3);
  return result.stdout;
}

test('FFmpeg overlay chain: later tap appears then disappears', () => {
  const rgb = encodeOverlay([{ id: 'later', at: 0.2, duration: 0.5 }]);
  assert.equal(isLit(rgb, 0), false);
  assert.equal(isLit(rgb, 3), false);
  assert.equal(isLit(rgb, 9), true);
  assert.equal(isLit(rgb, 30), false);
});

test('FFmpeg overlay chain: negative at starts mid-animation', () => {
  const rgb = encodeOverlay([{ id: 'partial', at: -0.2, duration: 0.7 }]);
  assert.equal(isLit(rgb, 0), true);
  assert.equal(isLit(rgb, 9), true);
  assert.equal(isLit(rgb, 21), false);
});

test('FFmpeg overlay chain: fully pre-start tap is absent', () => {
  const rgb = encodeOverlay([{ id: 'gone', at: -1, duration: 0.4 }]);
  assert.equal(isLit(rgb, 0), false);
  assert.equal(isLit(rgb, 6), false);
  assert.equal(isLit(rgb, 15), false);
});
