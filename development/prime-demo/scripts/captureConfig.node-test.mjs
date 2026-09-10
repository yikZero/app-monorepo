import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  DEFAULT_END_CUSHION_SECONDS,
  DEFAULT_INTERACTION_END_CUSHION_SECONDS,
  DEFAULT_READY_MARKER,
  DEFAULT_START_OFFSET_SECONDS,
  DEFAULT_WAIT_AFTER_READY_MS,
  LEGACY_REQUIRED_MARKERS,
  loadCaptureConfigFile,
  parseCaptureConfigObject,
  requiresAnimations,
  resolveCaptureTiming,
  resolveRequestedEndOffsetSeconds,
  selectReadyCapture,
  selectSceneMarker,
} = require('./captureConfig.js');

test('defaults match the previous hard-coded capture timing', () => {
  const none = resolveCaptureTiming({});
  assert.equal(none.interaction, null);
  assert.equal(none.readyMarker, DEFAULT_READY_MARKER);
  assert.deepEqual(none.requiredMarkers, LEGACY_REQUIRED_MARKERS);
  assert.equal(none.waitAfterReadyMs, 0);
  assert.equal(none.waitAfterAnimationsMs, 0);
  assert.equal(none.startOffsetSeconds, DEFAULT_START_OFFSET_SECONDS);
  assert.equal(none.startOffsetSeconds, -0.1);
  assert.equal(none.endCushionSeconds, DEFAULT_END_CUSHION_SECONDS);
  assert.equal(none.endCushionSeconds, 0.2);
  assert.equal(none.leadInSec, 0.1);

  const risk = resolveCaptureTiming({ interaction: 'risk-checkbox' });
  assert.equal(risk.interaction, 'risk-checkbox');
  assert.equal(risk.readyMarker, 'animationsComplete');
  assert.deepEqual(risk.requiredMarkers, LEGACY_REQUIRED_MARKERS);
  assert.equal(risk.waitAfterReadyMs, DEFAULT_WAIT_AFTER_READY_MS);
  assert.equal(risk.waitAfterReadyMs, 2200);
  assert.equal(risk.endCushionSeconds, DEFAULT_INTERACTION_END_CUSHION_SECONDS);
  assert.equal(risk.endCushionSeconds, 0.5);
});

test('legacy waitAfterAnimationsMs maps to waitAfterReadyMs', () => {
  const fileConfig = parseCaptureConfigObject({
    interaction: 'risk-checkbox',
    waitAfterAnimationsMs: 1000,
    startOffsetSeconds: -0.2,
    endCushionSeconds: 0.75,
  });
  const timing = resolveCaptureTiming({ interaction: null }, fileConfig);
  assert.equal(timing.interaction, 'risk-checkbox');
  assert.equal(timing.waitAfterReadyMs, 1000);
  assert.equal(timing.startOffsetSeconds, -0.2);
  assert.equal(timing.endCushionSeconds, 0.75);
});

test('explicit readyMarker omits animation prerequisites by default', () => {
  const timing = resolveCaptureTiming(
    {},
    parseCaptureConfigObject({
      readyMarker: 'sceneReady',
      waitAfterReadyMs: 0,
    }),
  );
  assert.equal(timing.readyMarker, 'sceneReady');
  assert.deepEqual(timing.requiredMarkers, []);
  assert.equal(timing.waitAfterReadyMs, 0);
});

test('both wait aliases together are rejected', () => {
  assert.throws(
    () =>
      resolveCaptureTiming(
        {},
        parseCaptureConfigObject({
          waitAfterReadyMs: 2200,
          waitAfterAnimationsMs: 1000,
        }),
      ),
    /cannot set both waitAfterReadyMs and waitAfterAnimationsMs/,
  );
});

test('empty readyMarker and non-string requiredMarkers are rejected', () => {
  assert.throws(
    () => parseCaptureConfigObject({ readyMarker: '' }),
    /readyMarker must be a nonempty string/,
  );
  assert.throws(
    () => parseCaptureConfigObject({ requiredMarkers: 'laserComplete' }),
    /requiredMarkers must be an array/,
  );
  assert.throws(
    () => parseCaptureConfigObject({ requiredMarkers: [''] }),
    /requiredMarkers\[0\] must be a nonempty string/,
  );
});

test('none-interaction wait is included in requested end; risk-checkbox is not', () => {
  const none = resolveCaptureTiming({});
  assert.equal(resolveRequestedEndOffsetSeconds(none), 0.2);

  const noneWait = resolveCaptureTiming(
    {},
    parseCaptureConfigObject({
      waitAfterReadyMs: 2200,
      endCushionSeconds: 0.2,
    }),
  );
  assert.equal(noneWait.interaction, null);
  assert.equal(
    resolveRequestedEndOffsetSeconds(noneWait),
    noneWait.endCushionSeconds + noneWait.waitAfterReadyMs / 1000,
  );

  const risk = resolveCaptureTiming({ interaction: 'risk-checkbox' });
  assert.equal(resolveRequestedEndOffsetSeconds(risk), 0.5);
});

test('selectReadyCapture accepts sceneReady with zero animation markers', () => {
  const selected = selectReadyCapture(
    [
      { name: 'cardMounted', sceneKey: 'scene-a', receivedAtMs: 1 },
      { name: 'sceneReady', sceneKey: 'scene-a', receivedAtMs: 2 },
    ],
    { readyMarker: 'sceneReady', requiredMarkers: [] },
  );
  assert.equal(selected.marker.name, 'sceneReady');
  assert.equal(selected.sceneKey, 'scene-a');
});

test('selectReadyCapture uses the latest scene and rejects stale unrelated markers', () => {
  const markers = [
    {
      name: 'sceneReady',
      sceneKey: 'old',
      receivedAtMs: 1,
    },
    {
      name: 'laserComplete',
      sceneKey: 'old',
      receivedAtMs: 2,
    },
    {
      name: 'sceneReady',
      sceneKey: 'new',
      receivedAtMs: 3,
    },
  ];
  assert.throws(
    () =>
      selectReadyCapture(markers, {
        readyMarker: 'sceneReady',
        requiredMarkers: ['laserComplete'],
      }),
    /scene "new" missing required markers: laserComplete/,
  );
  const ok = selectReadyCapture(markers, {
    readyMarker: 'sceneReady',
    requiredMarkers: [],
  });
  assert.equal(ok.sceneKey, 'new');
});

test('legacy default required markers still apply when readyMarker is omitted', () => {
  const timing = resolveCaptureTiming({});
  assert.throws(
    () =>
      selectReadyCapture(
        [{ name: 'animationsComplete', sceneKey: 's', receivedAtMs: 1 }],
        timing,
      ),
    /missing required markers: sheetVisible, cardMounted, laserComplete, shimmerComplete/,
  );
  const ok = selectReadyCapture(
    [
      { name: 'sheetVisible', sceneKey: 's', receivedAtMs: 1 },
      { name: 'cardMounted', sceneKey: 's', receivedAtMs: 1 },
      { name: 'laserComplete', sceneKey: 's', receivedAtMs: 2 },
      { name: 'shimmerComplete', sceneKey: 's', receivedAtMs: 3 },
      { name: 'animationsComplete', sceneKey: 's', receivedAtMs: 4 },
    ],
    timing,
  );
  assert.equal(ok.marker.name, 'animationsComplete');
});

test('requiresAnimations is true only when ready or required markers are animated', () => {
  assert.equal(
    requiresAnimations({
      readyMarker: 'animationsComplete',
      requiredMarkers: LEGACY_REQUIRED_MARKERS,
    }),
    true,
  );
  assert.equal(
    requiresAnimations({
      readyMarker: 'sceneReady',
      requiredMarkers: ['laserComplete'],
    }),
    true,
  );
  assert.equal(
    requiresAnimations({
      readyMarker: 'sceneReady',
      requiredMarkers: [],
    }),
    false,
  );
  assert.equal(
    requiresAnimations({
      readyMarker: 'sceneReady',
      requiredMarkers: ['sheetVisible', 'cardMounted'],
    }),
    false,
  );
});

test('selectSceneMarker: omitted searches all, null does not borrow other scenes', () => {
  const markers = [
    { name: 'sheetVisible', sceneKey: 'old', receivedAtMs: 1 },
    { name: 'sheetVisible', sceneKey: 'new', receivedAtMs: 2 },
    { name: 'sheetVisible', sceneKey: null, receivedAtMs: 3 },
  ];
  assert.equal(
    selectSceneMarker(markers, 'sheetVisible', 'new').sceneKey,
    'new',
  );
  assert.equal(selectSceneMarker(markers, 'sheetVisible', null).sceneKey, null);
  assert.equal(
    selectSceneMarker(markers, 'sheetVisible', null).receivedAtMs,
    3,
  );
  assert.equal(selectSceneMarker(markers, 'sheetVisible').receivedAtMs, 3);
  assert.equal(
    selectSceneMarker(markers, 'sheetVisible', undefined).receivedAtMs,
    3,
  );
  assert.equal(
    selectSceneMarker(
      [
        { name: 'cardMounted', sceneKey: 'other', receivedAtMs: 9 },
        { name: 'cardMounted', sceneKey: null, receivedAtMs: 1 },
      ],
      'cardMounted',
      null,
    ).receivedAtMs,
    1,
  );
});

test('unknown capture-config keys and illegal interaction fail', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-capture-config-'));
  const filePath = path.join(dir, 'bad.json');
  fs.writeFileSync(filePath, `${JSON.stringify({ extra: true })}\n`);
  assert.throws(() => loadCaptureConfigFile(filePath), /unknown keys/);
  assert.throws(
    () => resolveCaptureTiming({ interaction: 'confirm' }),
    /risk-checkbox/,
  );
});

test('steps are mutually exclusive with risk-checkbox and keep wait aliases', () => {
  const step = {
    id: 'openDapp',
    testID: 'prime-demo-open-dapp',
    waitForMarker: 'dappReady',
    holdMs: 1600,
  };
  assert.throws(
    () =>
      parseCaptureConfigObject({
        interaction: 'risk-checkbox',
        steps: [step],
      }),
    /both steps and interaction/,
  );
  const fileConfig = parseCaptureConfigObject({
    readyMarker: 'browserReady',
    requiredMarkers: [],
    waitAfterReadyMs: 1200,
    startMarker: 'browserReady',
    endMarker: 'riskAcknowledged',
    startOffsetSeconds: 0,
    endCushionSeconds: 0.5,
    steps: [step],
  });
  const timing = resolveCaptureTiming({}, fileConfig);
  assert.equal(timing.interaction, null);
  assert.equal(timing.readyMarker, 'browserReady');
  assert.deepEqual(timing.requiredMarkers, []);
  assert.equal(timing.waitAfterReadyMs, 1200);
  assert.equal(timing.startMarker, 'browserReady');
  assert.equal(timing.endMarker, 'riskAcknowledged');
  assert.equal(timing.steps.length, 1);
  assert.equal(timing.steps[0].id, 'openDapp');
  assert.equal(timing.steps[0].point, null);
  assert.equal(resolveRequestedEndOffsetSeconds(timing), 0.5);
  assert.equal(
    requiresAnimations({
      readyMarker: 'browserReady',
      requiredMarkers: [],
    }),
    false,
  );
});

test('bundled transaction-security-check timing resolves from its configuration', () => {
  const featurePath = fileURLToPath(
    new URL(
      '../features/transaction-security-check/feature.json',
      import.meta.url,
    ),
  );
  const raw = JSON.parse(fs.readFileSync(featurePath, 'utf8'));
  const timing = resolveCaptureTiming(
    {},
    parseCaptureConfigObject(raw.capture),
  );
  assert.equal(timing.interaction, null);
  assert.equal(timing.readyMarker, 'browserReady');
  assert.deepEqual(timing.requiredMarkers, []);
  assert.equal(timing.waitAfterReadyMs, raw.capture.waitAfterReadyMs);
  assert.equal(timing.startOffsetSeconds, raw.capture.startOffsetSeconds);
  assert.equal(timing.endCushionSeconds, raw.capture.endCushionSeconds);
  assert.equal(timing.startMarker, 'browserReady');
  assert.equal(timing.endMarker, 'closeCoverage');
  assert.deepEqual(
    timing.steps.map((step) => step.id),
    [
      'openDapp',
      'requestSignature',
      'showRiskDetails',
      'closeRiskDetails',
      'showCoverage',
      'closeCoverage',
    ],
  );
  assert.equal(timing.steps[1].pointMarker, 'dappReady');
  assert.equal(timing.steps[5].holdMs, raw.capture.steps[5].holdMs);
  assert.equal(
    resolveRequestedEndOffsetSeconds(timing),
    raw.capture.endCushionSeconds,
  );
});
