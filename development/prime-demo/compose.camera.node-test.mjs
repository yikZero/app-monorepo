import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CAMERA_EASINGS,
  DEFAULT_CAMERA_EASING,
  cameraCropYExpr,
  clampCameraKeyframes,
  interpolateCameraY,
  resolveCameraPlan,
  validateCameraConfig,
  validateCameraKeyframes,
} from './compose.mjs';
import {
  isTapOverlayActive,
  resolveTapPlan,
  validateTapsConfig,
} from './taps.mjs';

const PAN = [
  { at: 0, y: 0 },
  { at: 4.3, y: 0 },
  { at: 5.7, y: 240 },
];
const SAMPLE_U = [0, 0.25, 0.5, 0.75, 1];
const MOVE_10_110 = {
  linear: [10, 35, 60, 85, 110],
  'ease-in': [10, 16.25, 35, 66.25, 110],
  'ease-out': [10, 53.75, 85, 103.75, 110],
  'ease-in-out': [10, 25.625, 60, 94.375, 110],
  // Independent 6u^5-15u^4+10u^3: s(1/4)=53/512 → 20.3515625; s(3/4)=459/512 → 99.6484375.
  smootherstep: [10, 20.351_562_5, 60, 99.648_437_5, 110],
};
const CROP_FIRST_BYTES = {
  linear: [0, 32, 64, 96, 128],
  'ease-in': [0, 8, 32, 72, 128],
  'ease-out': [0, 56, 96, 120, 128],
  'ease-in-out': [0, 20, 64, 108, 128],
  // 0→64 crop, lum=Y*2. 64*s(1/4)=6.625 → FFmpeg round 7 → 14; 64*s(3/4)=57.375 → 57 → 114.
  smootherstep: [0, 14, 64, 114, 128],
};

const SAMPLE_LAYOUT = {
  displayH: 1770,
  visibleApertureH: 1032,
  outputScale: 3,
};

const RESEARCH_COMPOSE_START = 1.634;
const RESEARCH_STARTED_MS = 1_788_963_879_108;
const RESEARCH_RECEIVED_MS = 1_788_963_887_756;
const RESEARCH_HASH =
  '21f345ff3d7a3aadf75873136428ec72c727c27ac52fe124c49cba910219f314';
const RESEARCH_SCENE = '1788963880135-18285586.643583';
const RESEARCH_EVENT_AT =
  (RESEARCH_RECEIVED_MS - RESEARCH_STARTED_MS) / 1000 - RESEARCH_COMPOSE_START;
const RESEARCH_END = RESEARCH_EVENT_AT - 1.3;
const RESEARCH_START_1_4 = RESEARCH_END - 1.4;
const RESEARCH_START_2 = RESEARCH_END - 2;
const FEATURE_CAMERA_PATH = fileURLToPath(
  new URL('./features/signguard-permit2/camera.json', import.meta.url),
);
const LEGACY_CAMERA_PATH = fileURLToPath(
  new URL('./fixtures/camera-signguard.json', import.meta.url),
);

function assertRejected(fn, pattern) {
  assert.throws(fn, (error) => {
    assert.match(String(error.message), pattern);
    return true;
  });
}

function riskMove(overrides = {}) {
  return {
    marker: 'riskAcknowledged',
    arriveBefore: 1.3,
    duration: 1.4,
    y: 240,
    easing: 'ease-in-out',
    ...overrides,
  };
}

function movesConfig(moves, extra = {}) {
  return validateCameraConfig({
    offsetUnits: 'designPx',
    initialY: 0,
    ...extra,
    moves,
  });
}

function sceneMarker(name, receivedAtMs, extra = { point: { x: 30, y: 742 } }) {
  return {
    name,
    sceneKey: RESEARCH_SCENE,
    receivedAtMs,
    extra,
  };
}

function markerTake(overrides = {}) {
  return {
    rawHash: RESEARCH_HASH,
    matchedSceneKey: RESEARCH_SCENE,
    host: { recordingStartedMs: RESEARCH_STARTED_MS },
    markers: [sceneMarker('riskAcknowledged', RESEARCH_RECEIVED_MS)],
    ...overrides,
  };
}

function planForTake(config, take, extra = {}) {
  return resolveCameraPlan(config, {
    take,
    composeStart: RESEARCH_COMPOSE_START,
    inputSha256: take.rawHash || take.source?.rawHash || RESEARCH_HASH,
    layout: SAMPLE_LAYOUT,
    ...extra,
  });
}

test('omitted easing matches explicit ease-in-out', () => {
  const omitted = validateCameraKeyframes(PAN);
  const explicit = validateCameraKeyframes([
    { at: 0, y: 0 },
    { at: 4.3, y: 0, easing: 'ease-in-out' },
    { at: 5.7, y: 240 },
  ]);
  assert.equal(omitted[1].easing, DEFAULT_CAMERA_EASING);
  assert.equal(explicit[1].easing, 'ease-in-out');
  for (const u of SAMPLE_U) {
    const t = 4.3 + u * (5.7 - 4.3);
    assert.equal(
      interpolateCameraY(t, omitted),
      interpolateCameraY(t, explicit),
    );
  }
});

test('endpoints and quarter/mid points match independent tables', () => {
  assert.equal(DEFAULT_CAMERA_EASING, 'ease-in-out');
  assert.deepEqual(CAMERA_EASINGS, [
    'linear',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'smootherstep',
  ]);
  for (const easing of CAMERA_EASINGS) {
    const frames = validateCameraKeyframes([
      { at: 0, y: 10, easing },
      { at: 1, y: 110 },
    ]);
    const table = MOVE_10_110[easing];
    for (let i = 0; i < SAMPLE_U.length; i += 1) {
      assert.equal(
        interpolateCameraY(SAMPLE_U[i], frames),
        table[i],
        `${easing} t=${SAMPLE_U[i]}`,
      );
    }
  }
});

test('smootherstep stays inside endpoints and is monotone up and down', () => {
  const up = validateCameraKeyframes([
    { at: 0, y: 10, easing: 'smootherstep' },
    { at: 1, y: 110 },
  ]);
  const down = validateCameraKeyframes([
    { at: 0, y: 110, easing: 'smootherstep' },
    { at: 1, y: 10 },
  ]);
  const steps = 40;
  let prevUp = interpolateCameraY(0, up);
  let prevDown = interpolateCameraY(0, down);
  assert.equal(prevUp, 10);
  assert.equal(prevDown, 110);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const yUp = interpolateCameraY(t, up);
    const yDown = interpolateCameraY(t, down);
    assert.ok(yUp >= prevUp, `ascent t=${t}`);
    assert.ok(yDown <= prevDown, `descent t=${t}`);
    assert.ok(yUp >= 10 && yUp <= 110, `ascent overshoot t=${t}`);
    assert.ok(yDown >= 10 && yDown <= 110, `descent overshoot t=${t}`);
    prevUp = yUp;
    prevDown = yDown;
  }
  assert.equal(prevUp, 110);
  assert.equal(prevDown, 10);
});

test('successive segments can use different curves', () => {
  const frames = validateCameraKeyframes([
    { at: 0, y: 0, easing: 'linear' },
    { at: 1, y: 100, easing: 'ease-in' },
    { at: 2, y: 200 },
  ]);
  assert.equal(interpolateCameraY(0.5, frames), 50);
  assert.equal(interpolateCameraY(1.5, frames), 125);
});

test('clamping keeps easing on requested and effective keyframes', () => {
  const requested = validateCameraKeyframes([
    { at: 0, y: 0, easing: 'ease-out' },
    { at: 1, y: 400, easing: 'linear' },
  ]);
  const { keyframes, clamped } = clampCameraKeyframes(requested, 246);
  assert.equal(clamped, true);
  assert.equal(requested[0].easing, 'ease-out');
  assert.equal(requested[1].easing, 'linear');
  assert.equal(keyframes[0].easing, 'ease-out');
  assert.equal(keyframes[1].easing, 'linear');
  assert.equal(keyframes[1].y, 246);
  assert.equal(interpolateCameraY(1, keyframes), 246);
});

test('rejects unknown, null, boolean, and numeric easing', () => {
  assertRejected(
    () => validateCameraKeyframes([{ at: 0, y: 0, easing: 'bounce' }]),
    /easing must be one of/,
  );
  assertRejected(
    () => validateCameraKeyframes([{ at: 0, y: 0, easing: null }]),
    /easing must be one of/,
  );
  assertRejected(
    () => validateCameraKeyframes([{ at: 0, y: 0, easing: true }]),
    /easing must be one of/,
  );
  assertRejected(
    () => validateCameraKeyframes([{ at: 0, y: 0, easing: 1 }]),
    /easing must be one of/,
  );
});

test('FFmpeg crop output follows each easing curve', () => {
  const layout = {
    displayH: 128,
    visibleApertureH: 8,
    outputScale: 1,
  };
  for (const easing of CAMERA_EASINGS) {
    const frames = validateCameraKeyframes([
      { at: 0, y: 0, easing },
      { at: 1, y: 64 },
    ]);
    const yExpr = cameraCropYExpr({ keyframes: frames }, layout);
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
        'color=c=black:s=16x128:d=1.25:r=4',
        '-vf',
        `format=gray,geq=lum=Y*2,crop=w=8:h=8:x=0:y=${yExpr}`,
        '-frames:v',
        '5',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'gray',
        'pipe:1',
      ],
      { encoding: 'buffer' },
    );
    assert.equal(result.status, 0, `${easing}: ${result.stderr.toString()}`);
    assert.equal(result.stdout.length, 5 * 64, `${easing} byte length`);
    const firstBytes = [0, 1, 2, 3, 4].map((i) => result.stdout[i * 64]);
    assert.deepEqual(firstBytes, CROP_FIRST_BYTES[easing], easing);
  }
});

test('validateCameraConfig accepts keyframes, bare arrays, and moves', () => {
  const fromArray = validateCameraConfig(PAN);
  const fromObject = validateCameraConfig({
    offsetUnits: 'designPx',
    keyframes: PAN,
  });
  const fromMoves = validateCameraConfig({
    offsetUnits: 'designPx',
    initialY: 0,
    moves: [riskMove()],
  });
  assert.equal(fromArray.mode, 'keyframes');
  assert.equal(fromObject.mode, 'keyframes');
  assert.deepEqual(fromArray.keyframes, fromObject.keyframes);
  assert.equal(fromMoves.mode, 'moves');
  assert.equal(fromMoves.initialY, 0);
  assert.equal(fromMoves.moves[0].marker, 'riskAcknowledged');
  assert.equal(fromMoves.moves[0].duration, 1.4);
  assert.equal(fromMoves.moves[0].arriveBefore, 1.3);
});

test('validateCameraConfig defaults initialY and easing, rejects mixed forms', () => {
  const omitted = validateCameraConfig({
    moves: [
      {
        marker: 'riskAcknowledged',
        arriveBefore: 1.3,
        duration: 1.4,
        y: 240,
      },
    ],
  });
  assert.equal(omitted.initialY, 0);
  assert.equal(omitted.moves[0].easing, DEFAULT_CAMERA_EASING);
  assertRejected(
    () =>
      validateCameraConfig({
        keyframes: PAN,
        moves: [riskMove()],
      }),
    /must not set both keyframes and moves/,
  );
  assertRejected(
    () => validateCameraConfig({ moves: [] }),
    /moves must be a non-empty array/,
  );
  assertRejected(
    () => validateCameraConfig({ moves: [riskMove({ duration: 0 })] }),
    /duration must be > 0/,
  );
  assertRejected(
    () => validateCameraConfig({ moves: [riskMove({ arriveBefore: -0.1 })] }),
    /arriveBefore must be >= 0/,
  );
  assertRejected(
    () => validateCameraConfig({ moves: [riskMove({ marker: '' })] }),
    /marker must be a non-empty string/,
  );
  assertRejected(
    () => validateCameraConfig({ moves: [riskMove({ easing: 'bounce' })] }),
    /easing must be one of/,
  );
  assertRejected(
    () => validateCameraConfig({ initialY: -1, moves: [riskMove()] }),
    /initialY must be >= 0/,
  );
  assertRejected(
    () => validateCameraConfig({ offsetUnits: 'px', moves: [riskMove()] }),
    /offsetUnits must be designPx/,
  );
});

test('legacy fixture stays keyframes; bundled feature camera uses moves', () => {
  const legacy = validateCameraConfig(
    JSON.parse(fs.readFileSync(LEGACY_CAMERA_PATH, 'utf8')),
  );
  const feature = validateCameraConfig(
    JSON.parse(fs.readFileSync(FEATURE_CAMERA_PATH, 'utf8')),
  );
  assert.equal(legacy.mode, 'keyframes');
  assert.equal(legacy.keyframes[1].at, 4.3);
  assert.equal(legacy.keyframes[2].at, 5.7);
  assert.equal(legacy.keyframes[2].y, 240);
  assert.equal(feature.mode, 'moves');
  assert.deepEqual(feature.moves[0], {
    marker: 'riskAcknowledged',
    arriveBefore: 1.3,
    duration: 1.4,
    y: 240,
    easing: 'ease-in-out',
  });
});

test('legacy keyframes resolve without take and keep authored times', () => {
  const config = validateCameraConfig({
    offsetUnits: 'designPx',
    keyframes: [
      { at: 0, y: 0 },
      { at: 4.3, y: 0, easing: 'ease-in-out' },
      { at: 5.7, y: 240 },
    ],
  });
  const plan = resolveCameraPlan(config, { layout: SAMPLE_LAYOUT });
  assert.equal(plan.mode, 'keyframes');
  assert.equal(plan.moves, undefined);
  assert.equal(plan.keyframes[1].at, 4.3);
  assert.equal(plan.keyframes[2].at, 5.7);
  assert.equal(plan.clamped, false);
});

test('research take duration 1.4 and 2 match event 7.014 start/end', () => {
  assert.equal(RESEARCH_EVENT_AT, 7.013_999_999_999_999);
  assert.equal(RESEARCH_END, 5.713_999_999_999_999_5);
  assert.equal(RESEARCH_START_1_4, 4.314);
  assert.equal(RESEARCH_START_2, 3.713_999_999_999_999_5);

  const take = markerTake();
  const plan14 = planForTake(movesConfig([riskMove()]), take);
  const plan2 = planForTake(movesConfig([riskMove({ duration: 2 })]), take);

  assert.equal(plan14.resolvedMoves[0].eventAt, RESEARCH_EVENT_AT);
  assert.equal(plan14.resolvedMoves[0].start, RESEARCH_START_1_4);
  assert.equal(plan14.resolvedMoves[0].end, RESEARCH_END);
  assert.equal(plan14.keyframes[0].at, 0);
  assert.equal(plan14.keyframes[1].at, 4.314);
  assert.equal(plan14.keyframes[2].at, 5.713_999_999_999_999_5);
  assert.equal(plan14.keyframes[2].y, 240);

  assert.equal(plan2.resolvedMoves[0].eventAt, RESEARCH_EVENT_AT);
  assert.equal(plan2.resolvedMoves[0].start, RESEARCH_START_2);
  assert.equal(plan2.resolvedMoves[0].end, RESEARCH_END);
  assert.equal(plan2.keyframes[1].at, 3.713_999_999_999_999_5);
  assert.equal(plan2.keyframes[2].at, 5.713_999_999_999_999_5);

  const authored14 = validateCameraKeyframes([
    { at: 0, y: 0 },
    { at: 4.314, y: 0, easing: 'ease-in-out' },
    { at: 5.713_999_999_999_999_5, y: 240 },
  ]);
  assert.deepEqual(plan14.keyframes, authored14);
});

test('alternate takes reuse arriveBefore/duration without retiming by hand', () => {
  const composeStart = 0;
  // 7.071 / 7.005 / 7.014s events from distinct takes; same relative rule.
  for (const receivedAtMs of [7071, 7005, 7014]) {
    const eventAt = receivedAtMs / 1000;
    const take = markerTake({
      host: { recordingStartedMs: 0 },
      markers: [sceneMarker('riskAcknowledged', receivedAtMs)],
    });
    const plan14 = planForTake(movesConfig([riskMove()]), take, {
      composeStart,
    });
    const plan2 = planForTake(movesConfig([riskMove({ duration: 2 })]), take, {
      composeStart,
    });
    assert.equal(plan14.resolvedMoves[0].eventAt, eventAt, String(eventAt));
    assert.equal(plan14.resolvedMoves[0].end, eventAt - 1.3);
    assert.equal(plan14.resolvedMoves[0].start, eventAt - 1.3 - 1.4);
    assert.equal(plan2.resolvedMoves[0].end, eventAt - 1.3);
    assert.equal(plan2.resolvedMoves[0].start, eventAt - 1.3 - 2);
  }
});

test('missing take, hash mismatch, and source.rawHash fallback', () => {
  const config = movesConfig([riskMove()]);
  assertRejected(
    () =>
      resolveCameraPlan(config, {
        composeStart: RESEARCH_COMPOSE_START,
        inputSha256: RESEARCH_HASH,
        layout: SAMPLE_LAYOUT,
      }),
    /--take is required when --camera uses moves/,
  );
  assertRejected(
    () =>
      planForTake(config, markerTake(), { inputSha256: 'ffffffffffffffff' }),
    /rawHash does not match/,
  );
  assertRejected(
    () => planForTake(config, markerTake({ rawHash: '', source: {} })),
    /--take is missing rawHash/,
  );
  const fromSource = planForTake(
    config,
    markerTake({
      rawHash: '',
      source: { rawHash: RESEARCH_HASH },
    }),
    { inputSha256: RESEARCH_HASH },
  );
  assert.equal(fromSource.resolvedMoves[0].end, RESEARCH_END);
});

test('same-scene missing and duplicate markers fail; other scenes are ignored', () => {
  const config = movesConfig([riskMove()]);
  assertRejected(
    () => planForTake(config, markerTake({ markers: [] })),
    /No marker "riskAcknowledged"/,
  );
  assertRejected(
    () =>
      planForTake(
        config,
        markerTake({
          markers: [
            sceneMarker('riskAcknowledged', RESEARCH_RECEIVED_MS),
            sceneMarker('riskAcknowledged', RESEARCH_RECEIVED_MS + 10),
          ],
        }),
      ),
    /Ambiguous marker "riskAcknowledged"/,
  );
  assertRejected(
    () =>
      planForTake(
        config,
        markerTake({
          markers: [
            {
              name: 'riskAcknowledged',
              sceneKey: 'other-scene',
              receivedAtMs: RESEARCH_RECEIVED_MS,
            },
          ],
        }),
      ),
    /No marker "riskAcknowledged"/,
  );
});

test('camera does not require marker.extra.point', () => {
  const take = markerTake({
    markers: [
      {
        name: 'riskAcknowledged',
        sceneKey: RESEARCH_SCENE,
        receivedAtMs: RESEARCH_RECEIVED_MS,
      },
    ],
  });
  const plan = planForTake(movesConfig([riskMove()]), take);
  assert.equal(plan.resolvedMoves[0].eventAt, RESEARCH_EVENT_AT);
});

test('start=0 and adjacent moves do not emit duplicate-time keyframes', () => {
  const zeroStart = planForTake(
    movesConfig([
      riskMove({ arriveBefore: RESEARCH_EVENT_AT - 2, duration: 2 }),
    ]),
    markerTake(),
  );
  assert.equal(zeroStart.resolvedMoves[0].start, 0);
  assert.equal(zeroStart.resolvedMoves[0].end, 2);
  assert.equal(zeroStart.keyframes.length, 2);
  assert.equal(zeroStart.keyframes[0].at, 0);
  assert.equal(zeroStart.keyframes[0].y, 0);
  assert.equal(zeroStart.keyframes[0].easing, 'ease-in-out');
  assert.equal(zeroStart.keyframes[1].at, 2);
  assert.equal(zeroStart.keyframes[1].y, 240);

  const adjacent = planForTake(
    movesConfig([
      riskMove({ duration: 0.7, y: 80, easing: 'linear' }),
      {
        marker: 'confirmHint',
        arriveBefore: 0.6,
        duration: 0.7,
        y: 240,
        easing: 'ease-in',
      },
    ]),
    markerTake({
      markers: [
        sceneMarker('riskAcknowledged', RESEARCH_RECEIVED_MS),
        sceneMarker('confirmHint', RESEARCH_RECEIVED_MS),
      ],
    }),
  );
  assert.equal(adjacent.resolvedMoves[0].end, adjacent.resolvedMoves[1].start);
  assert.equal(adjacent.keyframes.length, 4);
  assert.deepEqual(
    adjacent.keyframes.map((kf) => kf.at),
    [
      0,
      adjacent.resolvedMoves[0].start,
      adjacent.resolvedMoves[0].end,
      adjacent.resolvedMoves[1].end,
    ],
  );
  assert.equal(adjacent.keyframes[2].y, 80);
  assert.equal(adjacent.keyframes[2].easing, 'ease-in');
  for (let i = 1; i < adjacent.keyframes.length; i += 1) {
    assert.ok(adjacent.keyframes[i].at > adjacent.keyframes[i - 1].at);
  }
});

test('decimal start at 0 and adjacent decimal ends snap within 1e-9', () => {
  const take = markerTake({
    host: { recordingStartedMs: 0 },
    markers: [
      sceneMarker('riskAcknowledged', 1900),
      sceneMarker('confirmHint', 2300),
    ],
  });
  const zero = planForTake(
    movesConfig([riskMove({ arriveBefore: 0.3, duration: 1.6 })]),
    take,
    { composeStart: 0 },
  );
  assert.equal(zero.resolvedMoves[0].eventAt, 1.9);
  assert.equal(zero.resolvedMoves[0].end, 1.9 - 0.3);
  assert.equal(zero.resolvedMoves[0].start, 0);
  assert.equal(zero.keyframes.length, 2);
  assert.equal(zero.keyframes[0].at, 0);
  assert.equal(zero.keyframes[1].at, zero.resolvedMoves[0].end);

  const adjacent = planForTake(
    movesConfig([
      riskMove({ arriveBefore: 0.3, duration: 1.6, y: 80, easing: 'linear' }),
      {
        marker: 'confirmHint',
        arriveBefore: 0.3,
        duration: 0.4,
        y: 240,
        easing: 'ease-in',
      },
    ]),
    take,
    { composeStart: 0 },
  );
  assert.equal(adjacent.resolvedMoves[0].start, 0);
  assert.equal(adjacent.resolvedMoves[1].start, adjacent.resolvedMoves[0].end);
  assert.equal(adjacent.keyframes.length, 3);
  assert.deepEqual(
    adjacent.keyframes.map((kf) => kf.at),
    [0, adjacent.resolvedMoves[0].end, adjacent.resolvedMoves[1].end],
  );
  for (let i = 1; i < adjacent.keyframes.length; i += 1) {
    assert.ok(adjacent.keyframes[i].at > adjacent.keyframes[i - 1].at);
  }
});

test('negative start, overlap, and out-of-order moves fail clearly', () => {
  assertRejected(
    () =>
      planForTake(
        movesConfig([riskMove({ arriveBefore: 1.3, duration: 8 })]),
        markerTake(),
      ),
    /before the trimmed output[\s\S]*longer lead-in[\s\S]*will not shift or freeze/,
  );
  assertRejected(
    () =>
      planForTake(
        movesConfig([
          riskMove({ duration: 1.4, y: 80 }),
          {
            marker: 'confirmHint',
            arriveBefore: 1.3,
            duration: 1.4,
            y: 240,
            easing: 'ease-in-out',
          },
        ]),
        markerTake({
          markers: [
            sceneMarker('riskAcknowledged', RESEARCH_RECEIVED_MS),
            sceneMarker('confirmHint', RESEARCH_RECEIVED_MS + 200),
          ],
        }),
      ),
    /overlaps previous move/,
  );
  assertRejected(
    () =>
      planForTake(
        movesConfig([
          {
            marker: 'later',
            arriveBefore: 0.2,
            duration: 0.4,
            y: 80,
            easing: 'linear',
          },
          riskMove(),
        ]),
        markerTake({
          markers: [
            sceneMarker('later', RESEARCH_RECEIVED_MS + 3000),
            sceneMarker('riskAcknowledged', RESEARCH_RECEIVED_MS),
          ],
        }),
      ),
    /before previous move start/,
  );
  assertRejected(
    () =>
      planForTake(
        movesConfig([riskMove({ arriveBefore: 0, duration: 1.000_001 })]),
        markerTake({
          host: { recordingStartedMs: 0 },
          markers: [sceneMarker('riskAcknowledged', 1000)],
        }),
        { composeStart: 0 },
      ),
    /before the trimmed output/,
  );
  assertRejected(
    () =>
      planForTake(
        movesConfig([
          riskMove({ arriveBefore: 1, duration: 1, y: 80 }),
          {
            marker: 'confirmHint',
            arriveBefore: 0.5,
            duration: 1.000_001,
            y: 240,
            easing: 'ease-in-out',
          },
        ]),
        markerTake({
          host: { recordingStartedMs: 0 },
          markers: [
            sceneMarker('riskAcknowledged', 3000),
            sceneMarker('confirmHint', 3500),
          ],
        }),
        { composeStart: 0 },
      ),
    /overlaps previous move/,
  );
});

test('y clamping still applies to resolved move keyframes', () => {
  const plan = planForTake(movesConfig([riskMove({ y: 400 })]), markerTake());
  assert.equal(plan.clamped, true);
  assert.equal(plan.maxDesignY, 246);
  assert.equal(plan.requestedKeyframes[2].y, 400);
  assert.equal(plan.keyframes[2].y, 246);
});

test('tap guide hidden does not change camera resolution', () => {
  const take = markerTake();
  const camera = planForTake(movesConfig([riskMove()]), take);
  const tapsOff = validateTapsConfig({
    enabled: false,
    events: [
      {
        id: 'risk-checkbox',
        marker: 'riskAcknowledged',
        duration: 0.85,
      },
    ],
  });
  assert.equal(isTapOverlayActive(tapsOff), false);
  const tapPlan = resolveTapPlan(tapsOff, {
    take,
    composeStart: RESEARCH_COMPOSE_START,
    srcW: 1178,
    srcH: 2556,
    inputSha256: RESEARCH_HASH,
  });
  assert.equal(tapPlan.active, false);
  assert.deepEqual(tapPlan.events, []);
  assert.equal(camera.resolvedMoves[0].eventAt, RESEARCH_EVENT_AT);
  assert.equal(camera.keyframes[1].at, 4.314);
});

function afterMove(overrides = {}) {
  return {
    marker: 'riskAcknowledged',
    arriveAfter: 1.6,
    duration: 0.8,
    y: 0,
    easing: 'ease-in-out',
    ...overrides,
  };
}

test('arriveAfter lands after the event; arriveBefore timing is unchanged', () => {
  const take = markerTake();
  const before = planForTake(movesConfig([riskMove()]), take);
  assert.equal(before.resolvedMoves[0].arriveBefore, 1.3);
  assert.equal(before.resolvedMoves[0].arriveAfter, undefined);
  assert.equal(before.resolvedMoves[0].end, RESEARCH_END);
  assert.equal(before.resolvedMoves[0].start, RESEARCH_START_1_4);

  const after = planForTake(movesConfig([afterMove({ y: 80 })]), take);
  assert.equal(after.resolvedMoves[0].arriveAfter, 1.6);
  assert.equal(after.resolvedMoves[0].arriveBefore, undefined);
  assert.equal(after.resolvedMoves[0].eventAt, RESEARCH_EVENT_AT);
  assert.equal(after.resolvedMoves[0].end, RESEARCH_EVENT_AT + 1.6);
  assert.equal(after.resolvedMoves[0].start, RESEARCH_EVENT_AT + 1.6 - 0.8);
  assert.equal(interpolateCameraY(RESEARCH_EVENT_AT, after.keyframes), 0);
  assert.equal(
    interpolateCameraY(RESEARCH_EVENT_AT + 1.6, after.keyframes),
    80,
  );
});

test('arriveBefore then arriveAfter on the same marker return to top after the tap', () => {
  const take = markerTake();
  const plan = planForTake(
    movesConfig([riskMove(), afterMove({ y: 0 })]),
    take,
  );
  assert.equal(plan.resolvedMoves.length, 2);
  assert.equal(plan.resolvedMoves[0].end, RESEARCH_END);
  assert.equal(plan.resolvedMoves[1].start, RESEARCH_EVENT_AT + 0.8);
  assert.equal(plan.resolvedMoves[1].end, RESEARCH_EVENT_AT + 1.6);
  assert.ok(plan.resolvedMoves[1].start >= plan.resolvedMoves[0].end);
  assert.equal(interpolateCameraY(RESEARCH_EVENT_AT, plan.keyframes), 240);
  assert.equal(
    interpolateCameraY(RESEARCH_EVENT_AT + 0.8, plan.keyframes),
    240,
  );
  assert.equal(interpolateCameraY(RESEARCH_EVENT_AT + 1.6, plan.keyframes), 0);
});

test('arriveBefore and arriveAfter are exclusive, required, and non-negative', () => {
  assertRejected(
    () => validateCameraConfig({ moves: [riskMove({ arriveAfter: 0.5 })] }),
    /must not set both arriveBefore and arriveAfter/,
  );
  assertRejected(
    () =>
      validateCameraConfig({
        moves: [{ marker: 'riskAcknowledged', duration: 1, y: 0 }],
      }),
    /must set exactly one of arriveBefore or arriveAfter/,
  );
  assertRejected(
    () => validateCameraConfig({ moves: [afterMove({ arriveAfter: -0.1 })] }),
    /arriveAfter must be >= 0/,
  );
});
