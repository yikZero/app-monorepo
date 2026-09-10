import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { selectSceneMarker } = require('./captureConfig.js');
const {
  HOST_TAP_CLOCK,
  HOST_TAP_POINT_SOURCE,
  applyHostDispatchTimes,
  parseCaptureSteps,
  pickVisibleDetoxRecord,
  readVisibleDetoxFrame,
  resolveStepTapPoint,
  runCaptureSteps,
} = require('./captureSteps.js');

const SCENE = 'scene-a';

function validStep(overrides = {}) {
  return {
    id: 'openDapp',
    testID: 'prime-demo-open-dapp',
    waitForMarker: 'dappReady',
    holdMs: 1600,
    ...overrides,
  };
}

test('steps reject unknown fields, mixed point sources, and wait combinations', () => {
  assert.throws(
    () => parseCaptureSteps([{ ...validStep(), extra: true }]),
    /unknown keys/,
  );
  assert.throws(
    () =>
      parseCaptureSteps([
        {
          ...validStep(),
          point: { x: 1, y: 2 },
          pointMarker: 'dappReady',
        },
      ]),
    /both point and pointMarker/,
  );
  assert.throws(
    () => parseCaptureSteps([{ id: 'a', testID: 'b' }]),
    /exactly one of/,
  );
  assert.throws(
    () =>
      parseCaptureSteps([
        {
          ...validStep(),
          waitForTestID: 'details',
        },
      ]),
    /exactly one of/,
  );
  assert.throws(
    () => parseCaptureSteps([{ ...validStep(), point: { x: -1, y: 0 } }]),
    /point.x must be >= 0/,
  );
  assert.throws(() => parseCaptureSteps([]), /non-empty array/);
  assert.throws(
    () => parseCaptureSteps([validStep(), validStep()]),
    /duplicate id/,
  );
});

test('frame center and explicit point convert to device screen coords', () => {
  const frame = { x: 10, y: 20, width: 100, height: 40 };
  const center = resolveStepTapPoint(parseCaptureSteps([validStep()])[0], {
    frame,
    markers: [],
    sceneKey: SCENE,
    selectSceneMarker,
  });
  assert.deepEqual(center.localPoint, { x: 50, y: 20 });
  assert.equal(center.localPointSource, 'frame-center');

  const explicit = resolveStepTapPoint(
    parseCaptureSteps([{ ...validStep(), point: { x: 10, y: 20 } }])[0],
    { frame, markers: [], sceneKey: SCENE, selectSceneMarker },
  );
  assert.deepEqual(explicit.localPoint, { x: 10, y: 20 });
  assert.equal(explicit.localPointSource, 'step-point');
});

test('pointMarker uses latest same-scene extra.localPoint and ignores other scenes', () => {
  const frame = { x: 8, y: 16, width: 200, height: 80 };
  const step = parseCaptureSteps([
    {
      id: 'requestSignature',
      testID: 'prime-demo-dapp-webview',
      pointMarker: 'dappReady',
      waitForMarker: 'securityResultReady',
    },
  ])[0];
  const resolved = resolveStepTapPoint(step, {
    frame,
    sceneKey: SCENE,
    selectSceneMarker,
    markers: [
      {
        name: 'dappReady',
        sceneKey: 'old',
        receivedAtMs: 9,
        extra: { localPoint: { x: 1, y: 1 } },
      },
      {
        name: 'dappReady',
        sceneKey: SCENE,
        receivedAtMs: 2,
        extra: { localPoint: { x: 30, y: 40 } },
      },
      {
        name: 'dappReady',
        sceneKey: SCENE,
        receivedAtMs: 4,
        extra: { localPoint: { x: 55, y: 66 } },
      },
    ],
  });
  assert.deepEqual(resolved.localPoint, { x: 55, y: 66 });
  assert.equal(resolved.localPointSource, 'pointMarker');
  assert.throws(
    () =>
      resolveStepTapPoint(step, {
        frame,
        sceneKey: SCENE,
        selectSceneMarker,
        markers: [
          {
            name: 'dappReady',
            sceneKey: 'other',
            receivedAtMs: 9,
            extra: { localPoint: { x: 1, y: 1 } },
          },
        ],
      }),
    /missing pointMarker "dappReady"/,
  );
});

test('visible attribute picker skips stale hidden dialog matches', () => {
  const visible = {
    visible: true,
    hittable: true,
    frame: { x: 2, y: 4, width: 10, height: 8 },
  };
  assert.equal(
    pickVisibleDetoxRecord({
      elements: [
        { visible: false, frame: { x: 0, y: 0, width: 1, height: 1 } },
        visible,
      ],
    }),
    visible,
  );
  assert.deepEqual(
    readVisibleDetoxFrame({
      elements: [
        { visible: false, frame: { x: 0, y: 0, width: 1, height: 1 } },
        visible,
      ],
    }),
    visible.frame,
  );
  assert.throws(
    () =>
      pickVisibleDetoxRecord({
        elements: [
          { visible: false, frame: { x: 0, y: 0, width: 1, height: 1 } },
        ],
      }),
    /stale hidden/,
  );
});

function createFakeDriver({
  frame = { x: 10, y: 20, width: 100, height: 40 },
  markers = [],
  failTestID = null,
} = {}) {
  const calls = [];
  let clock = 1000;
  const posted = [];
  return {
    calls,
    posted,
    selectSceneMarker,
    now: () => clock,
    log() {},
    async waitVisible(id) {
      calls.push({ op: 'waitVisible', id, at: clock });
      if (id === failTestID) {
        throw new Error(`${id} not visible`);
      }
    },
    async getAttributes() {
      calls.push({ op: 'getAttributes', at: clock });
      return { frame, visible: true };
    },
    async fetchMarkers() {
      return { markers: [...markers, ...posted] };
    },
    async postMarker(payload) {
      calls.push({ op: 'postMarker', name: payload.name, at: clock });
      posted.push({
        ...payload,
        receivedAtMs: clock + 8,
      });
      clock += 8;
    },
    async tap(id, localPoint) {
      calls.push({ op: 'tap', id, localPoint, at: clock });
      clock += 400;
    },
    async waitMarker(name) {
      calls.push({ op: 'waitMarker', name, at: clock });
      return { marker: { name, sceneKey: SCENE, receivedAtMs: clock } };
    },
    async waitVisibleTestID(id) {
      calls.push({ op: 'waitVisibleTestID', id, at: clock });
    },
    async waitGoneTestID(id) {
      calls.push({ op: 'waitGoneTestID', id, at: clock });
    },
    async sleep(ms) {
      calls.push({ op: 'sleep', ms, at: clock });
      clock += ms;
    },
  };
}

test('runCaptureSteps posts the host marker before tap and hold follows proven wait', async () => {
  const steps = parseCaptureSteps([validStep()]);
  const driver = createFakeDriver();
  const result = await runCaptureSteps(steps, { sceneKey: SCENE, driver });
  const ops = driver.calls.map((item) => item.op);
  assert.deepEqual(ops, [
    'waitVisible',
    'getAttributes',
    'postMarker',
    'tap',
    'waitMarker',
    'sleep',
  ]);
  const post = driver.calls.find((item) => item.op === 'postMarker');
  const tap = driver.calls.find((item) => item.op === 'tap');
  const wait = driver.calls.find((item) => item.op === 'waitMarker');
  const hold = driver.calls.find((item) => item.op === 'sleep');
  assert.ok(post.at < tap.at);
  assert.ok(wait.at >= tap.at);
  assert.equal(hold.ms, 1600);
  assert.equal(result.taps[0].pointSource, HOST_TAP_POINT_SOURCE);
  assert.equal(driver.posted[0].extra.clock, HOST_TAP_CLOCK);
  assert.equal(result.taps[0].hostTapMs, 1000);
  assert.equal(driver.posted[0].receivedAtMs, 1008);
  const normalized = applyHostDispatchTimes(driver.posted);
  assert.equal(normalized[0].receivedAtMs, result.taps[0].hostTapMs);
  assert.ok(normalized[0].receivedAtMs < tap.at);
});

test('applyHostDispatchTimes does not rewrite native state markers', () => {
  const markers = applyHostDispatchTimes([
    {
      name: 'riskAcknowledged',
      receivedAtMs: 50,
      extra: { checked: true, hostTapMs: 1 },
    },
    {
      name: 'openDapp',
      receivedAtMs: 80,
      extra: { clock: HOST_TAP_CLOCK, hostTapMs: 40 },
    },
  ]);
  assert.equal(markers[0].receivedAtMs, 50);
  assert.equal(markers[1].receivedAtMs, 40);
});

test('a failed step stops the tour; later taps are not dispatched', async () => {
  const steps = parseCaptureSteps([
    validStep(),
    {
      id: 'requestSignature',
      testID: 'prime-demo-dapp-webview',
      waitForMarker: 'securityResultReady',
    },
  ]);
  const driver = createFakeDriver({ failTestID: 'prime-demo-dapp-webview' });
  await assert.rejects(
    () => runCaptureSteps(steps, { sceneKey: SCENE, driver }),
    /capture step "requestSignature" failed/,
  );
  assert.equal(driver.calls.filter((item) => item.op === 'tap').length, 1);
  assert.equal(
    driver.calls.filter((item) => item.op === 'postMarker').length,
    1,
  );
});
