import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildComposeArgsFromSnapshot,
  buildRecordRunArgs,
  parseDemoArgs,
} from './demo.mjs';
import {
  FEATURES_DIR,
  FeatureConfigError,
  checkFeature,
  finalizeSnapshotDir,
  listFeatures,
  listSuccessfulTakes,
  loadFeature,
  loadFeatureFromSnapshot,
  loadSnapshotDir,
  parseTransactionSecurityCheckFixture,
  pickLatestSuccessfulTake,
  sha256File,
  toolSourceManifest,
  writeSnapshotDir,
} from './feature.mjs';
import { parseArgs as parseRunArgs } from './run.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const CAMERA = {
  offsetUnits: 'designPx',
  keyframes: [
    { at: 0, y: 0 },
    { at: 1, y: 10 },
  ],
};

const TAPS = {
  enabled: true,
  coordinateSpace: 'device',
  style: {
    radius: 14,
    color: '#FFFFFF',
    opacity: 0.46,
    ringColor: '#A8B3AE',
    ringOpacity: 0.28,
  },
  events: [
    {
      id: 'risk-checkbox',
      enabled: true,
      marker: 'riskAcknowledged',
      offset: 0,
      duration: 0.85,
    },
  ],
};

const FIXTURE = {
  title: 'Permit2',
  origin: 'https://app.uniswap.org',
  accountAddress: '0x13b30304dAa2129a21e42df663e8f49C49b276e8',
  accountLabel: 'Wallet 1 / Account #1',
  networkName: 'Ethereum',
  approveLabel: 'Token approval',
  approveAmount: 'Unlimited',
  approveSymbol: 'USDC',
  outgoing: { symbol: 'USDT', amount: '0.01' },
  incoming: { symbol: 'USDC', amount: '0.009993' },
};

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function seedFeature(featuresDir, id, overrides = {}) {
  const dir = path.join(featuresDir, id);
  fs.mkdirSync(dir, { recursive: true });
  writeJson(path.join(dir, 'fixture.json'), FIXTURE);
  writeJson(path.join(dir, 'camera.json'), CAMERA);
  writeJson(path.join(dir, 'taps.json'), TAPS);
  const realLayout = path.join(ROOT, 'presets/prime-393x852.json');
  if (fs.existsSync(realLayout)) {
    fs.copyFileSync(realLayout, path.join(dir, 'layout.json'));
  } else {
    writeJson(path.join(dir, 'layout.json'), { stub: true });
  }
  writeJson(path.join(dir, 'feature.json'), {
    schemaVersion: 1,
    id,
    title: 'Test feature',
    scene: 'signguard-permit2',
    fixture: 'fixture.json',
    camera: 'camera.json',
    taps: 'taps.json',
    layout: 'layout.json',
    capture: {
      interaction: 'risk-checkbox',
      readyMarker: 'animationsComplete',
      requiredMarkers: [
        'sheetVisible',
        'cardMounted',
        'laserComplete',
        'shimmerComplete',
      ],
      waitAfterReadyMs: 2200,
      startOffsetSeconds: -0.1,
      endCushionSeconds: 0.5,
    },
    compose: { holdSeconds: 2 },
    ...overrides,
  });
  return dir;
}

test('bundled signguard-permit2 feature files are present', () => {
  const dir = path.join(FEATURES_DIR, 'signguard-permit2');
  const feature = JSON.parse(
    fs.readFileSync(path.join(dir, 'feature.json'), 'utf8'),
  );
  assert.equal(feature.id, 'signguard-permit2');
  assert.equal(feature.scene, 'signguard-permit2');
  assert.equal(feature.layout, '../../presets/prime-393x852.json');
  assert.equal(feature.capture.readyMarker, 'animationsComplete');
  assert.deepEqual(feature.capture.requiredMarkers, [
    'sheetVisible',
    'cardMounted',
    'laserComplete',
    'shimmerComplete',
  ]);
  assert.equal(feature.capture.waitAfterReadyMs, 2200);
  assert.ok(fs.existsSync(path.join(dir, 'fixture.json')));
  assert.ok(fs.existsSync(path.join(dir, 'camera.json')));
  assert.ok(fs.existsSync(path.join(dir, 'taps.json')));
  const taps = JSON.parse(fs.readFileSync(path.join(dir, 'taps.json'), 'utf8'));
  assert.equal(taps.style.opacity, 0.46);
  assert.equal(taps.style.ringOpacity, 0.28);
  assert.equal(taps.events[0].duration, 0.85);
});

test('list includes signguard-permit2', () => {
  const ids = listFeatures().map((feature) => feature.id);
  assert.ok(ids.includes('signguard-permit2'));
});

test('list includes transaction-security-check', () => {
  const ids = listFeatures().map((feature) => feature.id);
  assert.ok(ids.includes('transaction-security-check'));
});

const TX_STEPS = [
  {
    id: 'openDapp',
    testID: 'prime-demo-open-dapp',
    waitForMarker: 'dappReady',
    holdMs: 1600,
  },
];

function txSecurityFixture(overrides = {}) {
  return {
    scene: 'transaction-security-check',
    title: 'Permit2',
    origin: 'http://localhost:4737/dapp',
    accountAddress: '0x13b30304dAa2129a21e42df663e8f49C49b276e8',
    accountLabel: 'Wallet 1 / Account #1',
    networkName: 'Ethereum',
    scanDelayMs: 1400,
    dapp: {
      name: 'Rewards Demo',
      url: 'http://localhost:4737/dapp',
      ctaLabel: 'Claim 100 USDC',
    },
    request: {
      method: 'eth_signTypedData_v4',
      params: [
        '0x13b30304dAa2129a21e42df663e8f49C49b276e8',
        { primaryType: 'PermitSingle' },
      ],
    },
    securityResponse: {
      detail: { code: 'malicious_approval', title: 'Malicious approval' },
    },
    ...overrides,
  };
}

function assertFiniteNonNegative(value, label) {
  assert.equal(typeof value, 'number', label);
  assert.ok(Number.isFinite(value) && value >= 0, `${label}=${value}`);
}

test('bundled transaction-security-check feature files and capture wiring', () => {
  const dir = path.join(FEATURES_DIR, 'transaction-security-check');
  const feature = JSON.parse(
    fs.readFileSync(path.join(dir, 'feature.json'), 'utf8'),
  );
  assert.equal(feature.id, 'transaction-security-check');
  assert.equal(feature.scene, 'transaction-security-check');
  assert.equal(feature.layout, '../../presets/prime-393x852.json');
  assert.equal(feature.capture.readyMarker, 'browserReady');
  assert.deepEqual(feature.capture.requiredMarkers, []);
  assert.equal(feature.capture.startMarker, 'browserReady');
  assert.equal(feature.capture.endMarker, 'closeCoverage');
  assertFiniteNonNegative(feature.capture.waitAfterReadyMs, 'waitAfterReadyMs');
  assertFiniteNonNegative(
    feature.capture.startOffsetSeconds,
    'startOffsetSeconds',
  );
  assertFiniteNonNegative(
    feature.capture.endCushionSeconds,
    'endCushionSeconds',
  );
  assertFiniteNonNegative(feature.compose.holdSeconds, 'holdSeconds');
  assert.ok(fs.existsSync(path.join(dir, 'fixture.json')));
  assert.ok(fs.existsSync(path.join(dir, 'camera.json')));
  assert.ok(fs.existsSync(path.join(dir, 'taps.json')));
  const camera = JSON.parse(
    fs.readFileSync(path.join(dir, 'camera.json'), 'utf8'),
  );
  assert.equal(camera.initialY, 0);
  assert.deepEqual(
    camera.moves.map((move) => move.marker),
    ['closeRiskDetails', 'showCoverage', 'closeCoverage', 'closeCoverage'],
  );
  assert.equal(camera.moves[3].y, 0);
  for (const move of camera.moves) {
    assertFiniteNonNegative(move.duration, `${move.marker} duration`);
  }
  assert.equal(feature.capture.steps.length, 6);
  const stepIds = feature.capture.steps.map((step) => step.id);
  assert.equal(stepIds.at(-1), 'closeCoverage');
  assert.ok(!stepIds.includes('confirm'));
  for (const step of feature.capture.steps) {
    assertFiniteNonNegative(step.holdMs, `${step.id} holdMs`);
  }
  const taps = JSON.parse(fs.readFileSync(path.join(dir, 'taps.json'), 'utf8'));
  assert.deepEqual(
    taps.events.map((event) => event.marker),
    stepIds,
  );
});

test('transaction-security-check fixture accepts edited copy and rejects a different primary type', () => {
  const edited = parseTransactionSecurityCheckFixture(
    txSecurityFixture({
      title: 'Edited demo title',
      dapp: {
        name: 'Local Rewards',
        url: 'http://localhost:4737/dapp',
        ctaLabel: 'Claim now',
      },
      securityResponse: {
        detail: {
          code: 'malicious_approval',
          title: 'User-edited warning',
          content: 'Custom body',
        },
      },
    }),
  );
  assert.equal(edited.title, 'Edited demo title');
  assert.equal(edited.dapp.ctaLabel, 'Claim now');
  assert.equal(edited.securityResponse.detail.title, 'User-edited warning');
  assert.throws(
    () =>
      parseTransactionSecurityCheckFixture(
        txSecurityFixture({
          request: {
            method: 'eth_signTypedData_v4',
            params: ['0x13', { primaryType: 'PermitBatch' }],
          },
        }),
      ),
    /primaryType must be "PermitSingle"/,
  );
  assert.throws(
    () => parseTransactionSecurityCheckFixture(FIXTURE),
    /Fixture missing string field "scene"/,
  );
});

test('checkFeature validates the bundled transaction-security-check feature', async () => {
  const result = await checkFeature('transaction-security-check');
  assert.equal(result.feature.id, 'transaction-security-check');
  assert.equal(result.layout.source, 'loadLayoutConfig');
  assert.equal(result.feature.capture.steps.length, 6);
  assert.equal(result.feature.capture.interaction, null);
});

test('record args for steps do not pass --interaction', () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-features-'));
  const dir = seedFeature(featuresDir, 'transaction-security-check', {
    scene: 'transaction-security-check',
    capture: {
      readyMarker: 'browserReady',
      requiredMarkers: [],
      waitAfterReadyMs: 1200,
      startMarker: 'browserReady',
      endMarker: 'riskAcknowledged',
      startOffsetSeconds: 0,
      endCushionSeconds: 0.5,
      steps: TX_STEPS,
    },
  });
  writeJson(path.join(dir, 'fixture.json'), txSecurityFixture());
  const feature = loadFeature('transaction-security-check', { featuresDir });
  const snapshotDir = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'prime-snap-')),
    'snapshot',
  );
  writeSnapshotDir(snapshotDir, {
    kind: 'take',
    feature,
    compose: { hold: 2, tapsEnabled: true },
  });
  const runArgs = buildRecordRunArgs({
    snapshotDir,
    takeDir: path.join(os.tmpdir(), 'prime-take-dir-unused'),
  });
  assert.equal(runArgs.includes('--interaction'), false);
  assert.ok(runArgs.includes('--take-dir'));
  const capture = JSON.parse(
    fs.readFileSync(path.join(snapshotDir, 'capture-config.json'), 'utf8'),
  );
  assert.equal(capture.interaction, null);
  assert.equal(capture.steps[0].id, 'openDapp');
});

test('tool source manifest includes captureSteps.js', () => {
  const files = toolSourceManifest().files.map((file) => file.path);
  assert.ok(files.includes('scripts/captureSteps.js'));
  const entry = toolSourceManifest().files.find(
    (file) => file.path === 'scripts/captureSteps.js',
  );
  assert.equal(entry.missing, false);
});

test('tool source manifest includes export.mjs and export-upload.sh', () => {
  const files = toolSourceManifest().files;
  for (const rel of [
    'export.mjs',
    'export-upload.sh',
    'environment.mjs',
    'build-ios.sh',
  ]) {
    const entry = files.find((file) => file.path === rel);
    assert.ok(entry, rel);
    assert.equal(entry.missing, false, rel);
  }
});

test('feature paths resolve from feature.json, not cwd', () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-features-'));
  const dir = seedFeature(featuresDir, 'signguard-permit2');
  const prev = process.cwd();
  process.chdir(os.tmpdir());
  try {
    const loaded = loadFeature('signguard-permit2', { featuresDir });
    assert.equal(loaded.paths.fixture, path.join(dir, 'fixture.json'));
    assert.equal(loaded.paths.layout, path.join(dir, 'layout.json'));
    assert.ok(path.isAbsolute(loaded.paths.camera));
  } finally {
    process.chdir(prev);
  }
});

test('unknown scene and illegal capture values fail before any native work', () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-features-'));
  seedFeature(featuresDir, 'other-page', { scene: 'message-confirm' });
  assert.throws(
    () => loadFeature('other-page', { featuresDir }),
    (error) =>
      error instanceof FeatureConfigError &&
      /Unsupported scene/.test(error.message),
  );

  seedFeature(featuresDir, 'bad-wait', {
    capture: {
      interaction: 'risk-checkbox',
      waitAfterAnimationsMs: -1,
      startOffsetSeconds: -0.1,
      endCushionSeconds: 0.5,
    },
  });
  assert.throws(
    () => loadFeature('bad-wait', { featuresDir }),
    /waitAfterAnimationsMs must be >= 0/,
  );

  seedFeature(featuresDir, 'both-waits', {
    capture: {
      interaction: 'risk-checkbox',
      waitAfterReadyMs: 2200,
      waitAfterAnimationsMs: 1000,
      startOffsetSeconds: -0.1,
      endCushionSeconds: 0.5,
    },
  });
  assert.throws(
    () => loadFeature('both-waits', { featuresDir }),
    /cannot set both waitAfterReadyMs and waitAfterAnimationsMs/,
  );

  seedFeature(featuresDir, 'scene-ready-only', {
    capture: {
      interaction: 'risk-checkbox',
      readyMarker: 'sceneReady',
      waitAfterReadyMs: 0,
      startOffsetSeconds: -0.1,
      endCushionSeconds: 0.5,
    },
  });
  const sceneReady = loadFeature('scene-ready-only', { featuresDir });
  assert.equal(sceneReady.capture.readyMarker, 'sceneReady');
  assert.deepEqual(sceneReady.capture.requiredMarkers, []);

  seedFeature(featuresDir, 'legacy-wait', {
    capture: {
      interaction: 'risk-checkbox',
      waitAfterAnimationsMs: 2200,
      startOffsetSeconds: -0.1,
      endCushionSeconds: 0.5,
    },
  });
  const legacy = loadFeature('legacy-wait', { featuresDir });
  assert.equal(legacy.capture.readyMarker, 'animationsComplete');
  assert.deepEqual(legacy.capture.requiredMarkers, [
    'sheetVisible',
    'cardMounted',
    'laserComplete',
    'shimmerComplete',
  ]);
  assert.equal(legacy.capture.waitAfterReadyMs, 2200);
});

test('checkFeature validates camera and taps', async () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-features-'));
  seedFeature(featuresDir, 'signguard-permit2');
  const result = await checkFeature('signguard-permit2', { featuresDir });
  assert.equal(result.feature.id, 'signguard-permit2');
  assert.equal(result.layout.source, 'loadLayoutConfig');
});

test('malformed fixture fails check before any native work', async () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-features-'));
  const dir = seedFeature(featuresDir, 'signguard-permit2');
  writeJson(path.join(dir, 'fixture.json'), {
    ...FIXTURE,
    origin: '   ',
    outgoing: { symbol: 'USDT' },
  });
  await assert.rejects(
    () => checkFeature('signguard-permit2', { featuresDir }),
    /Fixture missing string field "origin"|Fixture missing string field "amount"/,
  );
});

test('latest take skips failed/mismatched takes and ignores other folders', () => {
  const takesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-takes-'));
  const failed = path.join(takesDir, '2026-01-01T00-00-00-000Z');
  fs.mkdirSync(failed);
  fs.writeFileSync(path.join(failed, 'take.json'), '{}\n');

  const mismatch = path.join(takesDir, '2026-01-02T00-00-00-000Z');
  fs.mkdirSync(mismatch);
  fs.writeFileSync(path.join(mismatch, 'raw.mp4'), 'aaa');
  writeJson(path.join(mismatch, 'take.json'), {
    rawHash: 'deadbeef',
    video: { startSeconds: 1, actualEndSeconds: 2 },
  });

  const good = path.join(takesDir, '2026-01-03T00-00-00-000Z');
  fs.mkdirSync(good);
  fs.writeFileSync(path.join(good, 'raw.mp4'), 'good-raw');
  const hash = sha256File(path.join(good, 'raw.mp4'));
  writeJson(path.join(good, 'take.json'), {
    rawHash: hash,
    video: { startSeconds: 1.2, actualEndSeconds: 8.5 },
  });

  const listed = listSuccessfulTakes('signguard-permit2', { takesDir });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].takeDir, good);
  const latest = pickLatestSuccessfulTake('signguard-permit2', { takesDir });
  assert.equal(latest.takeDir, good);
});

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `missing ${flag}`);
  return args[index + 1];
}

test('record/compose args keep snapshot copies after live feature files change', () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-features-'));
  const dir = seedFeature(featuresDir, 'signguard-permit2');
  const feature = loadFeature('signguard-permit2', { featuresDir });
  const snapshotDir = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'prime-snap-')),
    'snapshot',
  );
  const takeDir = path.join(os.tmpdir(), 'prime-take-dir-unused');
  writeSnapshotDir(snapshotDir, {
    kind: 'take',
    feature,
    compose: { hold: 2, tapsEnabled: true },
  });
  const frozenFixture = fs.readFileSync(
    path.join(snapshotDir, 'fixture.json'),
    'utf8',
  );
  const frozenCamera = fs.readFileSync(
    path.join(snapshotDir, 'camera.json'),
    'utf8',
  );
  const frozenLayout = fs.readFileSync(
    path.join(snapshotDir, 'layout.json'),
    'utf8',
  );
  const frozenCapture = fs.readFileSync(
    path.join(snapshotDir, 'capture-config.json'),
    'utf8',
  );

  writeJson(path.join(dir, 'fixture.json'), { ...FIXTURE, title: 'MUTATED' });
  writeJson(path.join(dir, 'camera.json'), {
    offsetUnits: 'designPx',
    keyframes: [
      { at: 0, y: 0 },
      { at: 9, y: 999 },
    ],
  });
  fs.writeFileSync(path.join(dir, 'layout.json'), '{"mutated":true}\n');
  writeJson(path.join(dir, 'feature.json'), {
    ...JSON.parse(fs.readFileSync(path.join(dir, 'feature.json'), 'utf8')),
    compose: { holdSeconds: 99 },
    capture: {
      interaction: 'risk-checkbox',
      waitAfterAnimationsMs: 1,
      startOffsetSeconds: 0,
      endCushionSeconds: 9,
    },
  });

  const runArgs = buildRecordRunArgs({ snapshotDir, takeDir });
  const configFlags = [
    '--fixture',
    '--camera',
    '--taps',
    '--layout',
    '--capture-config',
  ];
  for (const flag of configFlags) {
    const value = flagValue(runArgs, flag);
    assert.equal(path.dirname(value), snapshotDir, `${flag} must be snapshot`);
  }
  assert.equal(flagValue(runArgs, '--hold'), '2');
  assert.equal(flagValue(runArgs, '--interaction'), 'risk-checkbox');
  assert.equal(
    fs.readFileSync(flagValue(runArgs, '--fixture'), 'utf8'),
    frozenFixture,
  );
  assert.equal(
    fs.readFileSync(flagValue(runArgs, '--camera'), 'utf8'),
    frozenCamera,
  );
  assert.equal(
    fs.readFileSync(flagValue(runArgs, '--layout'), 'utf8'),
    frozenLayout,
  );
  assert.equal(
    fs.readFileSync(flagValue(runArgs, '--capture-config'), 'utf8'),
    frozenCapture,
  );
  assert.match(
    fs.readFileSync(path.join(dir, 'fixture.json'), 'utf8'),
    /MUTATED/,
  );
  assert.match(fs.readFileSync(path.join(dir, 'camera.json'), 'utf8'), /999/);

  const takePath = path.join(snapshotDir, 'take.json');
  writeJson(takePath, {
    rawHash: 'abc',
    video: { startSeconds: 1, actualEndSeconds: 2, holdSeconds: 2 },
  });
  const snapshot = loadSnapshotDir(snapshotDir);
  const composeArgs = buildComposeArgsFromSnapshot(snapshot, {
    input: '/tmp/raw.mp4',
    output: '/tmp/demo.mp4',
    poster: '/tmp/demo.png',
    start: 1,
    end: 2,
    hold: 2,
    tapsEnabled: true,
  });
  assert.equal(composeArgs.camera, path.join(snapshotDir, 'camera.json'));
  assert.equal(composeArgs.taps, path.join(snapshotDir, 'taps.json'));
  assert.equal(composeArgs.layout, path.join(snapshotDir, 'layout.json'));
  assert.equal(composeArgs.take, takePath);
  assert.equal(fs.readFileSync(composeArgs.camera, 'utf8'), frozenCamera);
  const hidden = buildComposeArgsFromSnapshot(snapshot, {
    input: '/tmp/raw.mp4',
    output: '/tmp/demo.mp4',
    poster: '/tmp/demo.png',
    start: 1,
    end: 2,
    hold: 2,
    tapsEnabled: false,
  });
  assert.equal(hidden.taps, null);
  assert.equal(hidden.take, takePath);
});

test('finalizeSnapshotDir adds take metadata without recopying live config', () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-features-'));
  const dir = seedFeature(featuresDir, 'signguard-permit2');
  const feature = loadFeature('signguard-permit2', { featuresDir });
  const snapshotDir = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'prime-snap-')),
    'snapshot',
  );
  writeSnapshotDir(snapshotDir, {
    kind: 'take',
    feature,
    compose: { hold: 2, tapsEnabled: true },
  });
  const frozenFixture = fs.readFileSync(
    path.join(snapshotDir, 'fixture.json'),
    'utf8',
  );
  writeJson(path.join(dir, 'fixture.json'), { ...FIXTURE, title: 'MUTATED' });
  const takeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-take-'));
  fs.writeFileSync(path.join(takeDir, 'raw.mp4'), 'raw-bytes');
  const rawHash = sha256File(path.join(takeDir, 'raw.mp4'));
  const takePath = path.join(takeDir, 'take.json');
  writeJson(takePath, {
    rawHash,
    matchedSceneKey: 'scene',
    video: {
      startSeconds: 1.4,
      requestedEndSeconds: 8.9,
      actualEndSeconds: 8.5,
      holdSeconds: 2,
    },
  });
  const meta = finalizeSnapshotDir(snapshotDir, {
    takeRecord: {
      takePath,
      takeDir,
      rawPath: path.join(takeDir, 'raw.mp4'),
      rawHash,
      take: JSON.parse(fs.readFileSync(takePath, 'utf8')),
    },
    compose: {
      start: 1.4,
      end: 8.5,
      hold: 2,
      tapsEnabled: true,
    },
  });
  assert.equal(
    fs.readFileSync(path.join(snapshotDir, 'fixture.json'), 'utf8'),
    frozenFixture,
  );
  assert.equal(meta.raw.sha256, rawHash);
  assert.equal(meta.raw.path, path.join(takeDir, 'raw.mp4'));
  assert.equal(typeof meta.raw.relativePath, 'string');
  assert.ok(meta.raw.relativePath.includes('raw.mp4'));
  assert.equal(meta.take.actualEndSeconds, 8.5);
  assert.equal(meta.compose.start, 1.4);
  assert.ok(fs.existsSync(path.join(snapshotDir, 'take.json')));
});

test('snapshot copies stay frozen after the live feature json changes', () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-features-'));
  const dir = seedFeature(featuresDir, 'signguard-permit2');
  const feature = loadFeature('signguard-permit2', { featuresDir });
  const snapshotDir = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'prime-snap-')),
    'snapshot',
  );
  writeSnapshotDir(snapshotDir, {
    kind: 'render',
    feature,
    compose: { start: 1, end: 2, hold: 2, tapsEnabled: true },
  });
  writeJson(path.join(dir, 'feature.json'), {
    ...JSON.parse(fs.readFileSync(path.join(dir, 'feature.json'), 'utf8')),
    title: 'MUTATED',
    compose: { holdSeconds: 99 },
  });
  const snapshot = loadSnapshotDir(snapshotDir);
  const frozen = loadFeatureFromSnapshot(snapshot);
  assert.equal(frozen.title, 'Test feature');
  assert.equal(frozen.compose.holdSeconds, 2);
  const live = loadFeature('signguard-permit2', { featuresDir });
  assert.equal(live.title, 'MUTATED');
  assert.equal(live.compose.holdSeconds, 99);
});

test('demo CLI position: command then feature-id, then flags', () => {
  const options = parseDemoArgs([
    'render',
    'signguard-permit2',
    '--take',
    'latest',
    '--hold',
    '4',
    '--no-taps',
  ]);
  assert.equal(options.command, 'render');
  assert.equal(options.target, 'signguard-permit2');
  assert.equal(options.take, 'latest');
  assert.equal(options.hold, 4);
  assert.equal(options.noTaps, true);
  assert.equal(options.output, null);
  assert.equal(options.crf, null);
});

test('export CLI takes master path, --output dir, and --crf', () => {
  const options = parseDemoArgs([
    'export',
    'demo.mp4',
    '--output',
    'out-dir',
    '--crf',
    '23',
  ]);
  assert.equal(options.command, 'export');
  assert.equal(options.target, 'demo.mp4');
  assert.equal(options.output, 'out-dir');
  assert.equal(options.crf, 23);
});

test('export rejects record flags; other commands reject --output/--crf', () => {
  assert.throws(
    () => parseDemoArgs(['export', 'a.mp4', '--take', 'latest']),
    /--take/,
  );
  assert.throws(
    () => parseDemoArgs(['export', 'a.mp4', '--hold', '1']),
    /--hold/,
  );
  assert.throws(
    () => parseDemoArgs(['export', 'a.mp4', '--no-taps']),
    /--no-taps/,
  );
  assert.throws(
    () => parseDemoArgs(['export', 'a.mp4', '--udid', 'x']),
    /--udid/,
  );
  assert.throws(
    () => parseDemoArgs(['export', 'a.mp4', '--app-path', 'a.app']),
    /--app-path/,
  );
  assert.throws(
    () => parseDemoArgs(['render', 'feat', '--output', 'x']),
    /--output/,
  );
  assert.throws(
    () => parseDemoArgs(['record', 'feat', '--crf', '18']),
    /--crf/,
  );
  assert.throws(
    () => parseDemoArgs(['export', 'a.mp4', '--crf', '52']),
    /0-51/,
  );
});

test('run.mjs forwards the four feature wiring flags', () => {
  const options = parseRunArgs([
    '--fixture',
    'fix.json',
    '--take-dir',
    'takes/one',
    '--layout',
    'layout.json',
    '--capture-config',
    'cap.json',
  ]);
  assert.equal(options.fixture, 'fix.json');
  assert.equal(options.takeDir, 'takes/one');
  assert.equal(options.layout, 'layout.json');
  assert.equal(options.captureConfig, 'cap.json');
  assert.equal(options.reuseServices, false);
});

test('check from another cwd still resolves bundled fixture/camera/taps', () => {
  const demoPath = path.join(ROOT, 'demo.mjs');
  const result = spawnSync(
    process.execPath,
    [demoPath, 'check', 'signguard-permit2'],
    { cwd: os.tmpdir(), encoding: 'utf8' },
  );
  const combined = `${result.stdout}\n${result.stderr}`;
  if (result.status !== 0 && /layout not found/.test(combined)) {
    assert.match(combined, /presets\/prime-393x852\.json/);
    return;
  }
  assert.equal(result.status, 0, combined);
  assert.match(result.stdout, /signguard-permit2/);
  assert.match(result.stdout, /resolved from feature.json, not cwd/);
  assert.match(result.stdout, /features\/signguard-permit2\/fixture\.json/);
});

test('sha256 helper is stable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-hash-'));
  const filePath = path.join(dir, 'raw.mp4');
  fs.writeFileSync(filePath, 'raw');
  assert.equal(
    sha256File(filePath),
    crypto.createHash('sha256').update('raw').digest('hex'),
  );
});
