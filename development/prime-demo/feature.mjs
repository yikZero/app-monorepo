import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCameraConfig } from './compose.mjs';
import { loadTapsConfig } from './taps.mjs';

const require = createRequire(import.meta.url);
const {
  parseCaptureConfigObject,
  resolveCaptureTiming,
} = require('./scripts/captureConfig.js');

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

export const PRIME_DEMO_ROOT = SCRIPT_DIR;
export const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
export const FEATURES_DIR = path.join(PRIME_DEMO_ROOT, 'features');
export const FEATURE_SCHEMA_VERSION = 1;
export const SUPPORTED_SCENES = [
  'signguard-permit2',
  'transaction-security-check',
];
export const FEATURE_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
export const KNOWN_LIMITATIONS = {
  'signguard-permit2': [
    'The first ~0.6s of the composed clip may show the confirmation title before the sheet body settles. This is a known trim limitation, not a capture failure.',
  ],
  'transaction-security-check': [
    'The browser shell and scan response are local fixtures. Camera timing follows capture events; framing still needs review after UI layout changes.',
  ],
};

const TOOL_SOURCE_FILES = [
  'demo.mjs',
  'export.mjs',
  'export-upload.sh',
  'environment.mjs',
  'build-ios.sh',
  'feature.mjs',
  'compose.mjs',
  'taps.mjs',
  'layout.mjs',
  'run.mjs',
  'scripts/capture.js',
  'scripts/captureConfig.js',
  'scripts/captureSteps.js',
  'scripts/riskCheckboxPoint.js',
  'scripts/fixture-server.js',
];

export class FeatureConfigError extends Error {
  constructor(message, options) {
    super(message, options);
    this.code = 'FEATURE_CONFIG';
  }
}

function configError(message, options) {
  return new FeatureConfigError(message, options);
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value) {
    throw configError(`${label} must be a non-empty string`);
  }
  return value;
}

function requireFinite(value, label, { min } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw configError(
      `${label} must be a finite number, got ${JSON.stringify(value)}`,
    );
  }
  if (min !== undefined && value < min) {
    throw configError(`${label} must be >= ${min}, got ${value}`);
  }
  return value;
}

export function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

export function featureOutputRoot(featureId) {
  return path.join(PRIME_DEMO_ROOT, 'output', 'features', featureId);
}

export function featureTakesDir(featureId) {
  return path.join(featureOutputRoot(featureId), 'takes');
}

export function featureRendersDir(featureId) {
  return path.join(featureOutputRoot(featureId), 'renders');
}

export function newTimestampId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function readJsonFile(filePath, label = filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw configError(`${label} not found: ${filePath}`, { cause: error });
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw configError(
      `${label} is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}

export function listFeatureIds(featuresDir = FEATURES_DIR) {
  if (!fs.existsSync(featuresDir)) {
    return [];
  }
  return fs
    .readdirSync(featuresDir)
    .filter((name) => {
      const dir = path.join(featuresDir, name);
      return (
        fs.statSync(dir).isDirectory() &&
        fs.existsSync(path.join(dir, 'feature.json'))
      );
    })
    .toSorted();
}

export function listFeatures(featuresDir = FEATURES_DIR) {
  return listFeatureIds(featuresDir).map((id) => {
    const featurePath = path.join(featuresDir, id, 'feature.json');
    const raw = readJsonFile(featurePath, featurePath);
    return {
      id,
      jsonId: typeof raw.id === 'string' ? raw.id : null,
      title: typeof raw.title === 'string' ? raw.title : '',
      scene: typeof raw.scene === 'string' ? raw.scene : '',
      featurePath,
    };
  });
}

function resolveRel(featureDir, rel, label) {
  const value = requireString(rel, label);
  const resolved = path.resolve(featureDir, value);
  return resolved;
}

function canonicalCapture(timing) {
  return {
    interaction: timing.interaction,
    readyMarker: timing.readyMarker,
    requiredMarkers: timing.requiredMarkers,
    waitAfterReadyMs: timing.waitAfterReadyMs,
    startOffsetSeconds: timing.startOffsetSeconds,
    endCushionSeconds: timing.endCushionSeconds,
    startMarker: timing.startMarker ?? null,
    endMarker: timing.endMarker ?? null,
    steps: timing.steps ?? null,
  };
}

function parseCaptureBlock(raw) {
  if (raw === undefined) {
    return canonicalCapture(resolveCaptureTiming({}));
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw configError('capture must be an object');
  }
  try {
    return canonicalCapture(
      resolveCaptureTiming({}, parseCaptureConfigObject(raw)),
    );
  } catch (error) {
    throw configError(error instanceof Error ? error.message : String(error), {
      cause: error,
    });
  }
}

function parseComposeBlock(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw configError('compose must be an object');
  }
  return {
    holdSeconds: requireFinite(raw.holdSeconds, 'compose.holdSeconds', {
      min: 0,
    }),
  };
}

export function loadFeature(featureId, { featuresDir = FEATURES_DIR } = {}) {
  if (typeof featureId !== 'string' || !FEATURE_ID_RE.test(featureId)) {
    throw configError(
      `feature-id must match ${FEATURE_ID_RE}: got ${JSON.stringify(featureId)}`,
    );
  }
  const featureDir = path.join(featuresDir, featureId);
  const featurePath = path.join(featureDir, 'feature.json');
  if (!fs.existsSync(featurePath)) {
    throw configError(`feature.json not found: ${featurePath}`);
  }
  const raw = readJsonFile(featurePath, featurePath);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw configError('feature.json must be an object');
  }
  if (raw.schemaVersion !== FEATURE_SCHEMA_VERSION) {
    throw configError(
      `feature.schemaVersion must be ${FEATURE_SCHEMA_VERSION}, got ${JSON.stringify(
        raw.schemaVersion,
      )}`,
    );
  }
  const id = requireString(raw.id, 'feature.id');
  if (id !== featureId) {
    throw configError(
      `feature.id ${JSON.stringify(id)} does not match directory ${JSON.stringify(
        featureId,
      )}`,
    );
  }
  const title = requireString(raw.title, 'feature.title');
  const scene = requireString(raw.scene, 'feature.scene');
  if (!SUPPORTED_SCENES.includes(scene)) {
    throw configError(
      `Unsupported scene ${JSON.stringify(
        scene,
      )}. This CLI only drives the ${SUPPORTED_SCENES.join(
        ', ',
      )} native adapter; copying JSON does not control other pages.`,
    );
  }
  const paths = {
    featureDir,
    featureJson: featurePath,
    fixture: resolveRel(featureDir, raw.fixture, 'feature.fixture'),
    camera: resolveRel(featureDir, raw.camera, 'feature.camera'),
    taps: resolveRel(featureDir, raw.taps, 'feature.taps'),
    layout: resolveRel(featureDir, raw.layout, 'feature.layout'),
  };
  const requiredFiles = ['fixture', 'camera', 'taps', 'layout'];
  for (const key of requiredFiles) {
    const filePath = paths[key];
    if (!fs.existsSync(filePath)) {
      throw configError(`feature.${key} not found: ${filePath}`);
    }
  }
  const capture = parseCaptureBlock(raw.capture);
  const compose = parseComposeBlock(raw.compose);
  return {
    id,
    title,
    scene,
    schemaVersion: FEATURE_SCHEMA_VERSION,
    raw,
    paths,
    capture,
    compose,
    knownLimitations: KNOWN_LIMITATIONS[scene] || [],
  };
}

function requireFixtureString(record, key) {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw configError(`Fixture missing string field "${key}"`);
  }
  return value;
}

function requireFixtureAssetChange(value, key) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw configError(`Fixture missing object field "${key}"`);
  }
  return {
    symbol: requireFixtureString(value, 'symbol'),
    amount: requireFixtureString(value, 'amount'),
  };
}

function requireFixtureObject(value, key) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw configError(`Fixture missing object field "${key}"`);
  }
  return value;
}

function typedDataPrimaryType(params) {
  if (!Array.isArray(params) || params.length < 2) {
    return null;
  }
  let typed = params[1];
  if (typeof typed === 'string') {
    try {
      typed = JSON.parse(typed);
    } catch {
      return null;
    }
  }
  if (!typed || typeof typed !== 'object' || Array.isArray(typed)) {
    return null;
  }
  return typeof typed.primaryType === 'string' ? typed.primaryType : null;
}

export function parseSignguardPermit2Fixture(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw configError('Fixture JSON is not an object');
  }
  return {
    title: requireFixtureString(value, 'title'),
    origin: requireFixtureString(value, 'origin'),
    accountAddress: requireFixtureString(value, 'accountAddress'),
    accountLabel: requireFixtureString(value, 'accountLabel'),
    networkName: requireFixtureString(value, 'networkName'),
    approveLabel: requireFixtureString(value, 'approveLabel'),
    approveAmount: requireFixtureString(value, 'approveAmount'),
    approveSymbol: requireFixtureString(value, 'approveSymbol'),
    outgoing: requireFixtureAssetChange(value.outgoing, 'outgoing'),
    incoming: requireFixtureAssetChange(value.incoming, 'incoming'),
  };
}

export function parseTransactionSecurityCheckFixture(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw configError('Fixture JSON is not an object');
  }
  const scene = requireFixtureString(value, 'scene');
  if (scene !== 'transaction-security-check') {
    throw configError(
      `Fixture scene must be "transaction-security-check", got ${JSON.stringify(
        scene,
      )}`,
    );
  }
  const dapp = requireFixtureObject(value.dapp, 'dapp');
  const request = requireFixtureObject(value.request, 'request');
  const securityResponse = requireFixtureObject(
    value.securityResponse,
    'securityResponse',
  );
  const detail = requireFixtureObject(
    securityResponse.detail,
    'securityResponse.detail',
  );
  requireFixtureString(detail, 'code');
  const method = requireFixtureString(request, 'method');
  if (!Array.isArray(request.params)) {
    throw configError('Fixture request.params must be an array');
  }
  const primaryType = typedDataPrimaryType(request.params);
  if (primaryType && primaryType !== 'PermitSingle') {
    throw configError(
      `Fixture request typed data primaryType must be "PermitSingle", got ${JSON.stringify(
        primaryType,
      )}`,
    );
  }
  if (value.metadata !== undefined) {
    requireFixtureObject(value.metadata, 'metadata');
  }
  return {
    scene,
    title: requireFixtureString(value, 'title'),
    origin: requireFixtureString(value, 'origin'),
    accountAddress: requireFixtureString(value, 'accountAddress'),
    accountLabel: requireFixtureString(value, 'accountLabel'),
    networkName: requireFixtureString(value, 'networkName'),
    scanDelayMs: requireFinite(value.scanDelayMs, 'scanDelayMs', { min: 0 }),
    dapp: {
      name: requireFixtureString(dapp, 'name'),
      url: requireFixtureString(dapp, 'url'),
      ctaLabel: requireFixtureString(dapp, 'ctaLabel'),
    },
    request: {
      method,
      params: request.params,
    },
    securityResponse,
  };
}

export async function preflightLayout(layoutPath) {
  if (!fs.existsSync(layoutPath)) {
    throw configError(`layout not found: ${layoutPath}`);
  }
  const layoutUrl = new URL('./layout.mjs', import.meta.url);
  const loader = await import(layoutUrl);
  if (typeof loader.loadLayoutConfig !== 'function') {
    throw configError('layout.mjs must export loadLayoutConfig(filePath)');
  }
  try {
    return {
      source: 'loadLayoutConfig',
      config: loader.loadLayoutConfig(layoutPath),
    };
  } catch (error) {
    throw configError(
      `layout invalid: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

export async function checkFeature(
  featureId,
  { featuresDir = FEATURES_DIR } = {},
) {
  const feature = loadFeature(featureId, { featuresDir });
  let camera;
  try {
    camera = readJsonFile(feature.paths.camera, feature.paths.camera);
    validateCameraConfig(camera);
  } catch (error) {
    throw configError(
      `camera invalid: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  try {
    loadTapsConfig(feature.paths.taps);
  } catch (error) {
    throw configError(
      `taps invalid: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  const layout = await preflightLayout(feature.paths.layout);
  try {
    const fixture = readJsonFile(feature.paths.fixture, feature.paths.fixture);
    if (feature.scene === 'signguard-permit2') {
      parseSignguardPermit2Fixture(fixture);
    } else if (feature.scene === 'transaction-security-check') {
      parseTransactionSecurityCheckFixture(fixture);
    }
  } catch (error) {
    if (error instanceof FeatureConfigError) {
      throw error;
    }
    throw configError(
      `fixture invalid: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  return { feature, camera, layout };
}

export function formatCheckReport({ feature, layout }) {
  const lines = [
    `feature ${feature.id}`,
    `title ${feature.title}`,
    `scene ${feature.scene}`,
    `schemaVersion ${feature.schemaVersion}`,
    'paths (resolved from feature.json, not cwd):',
    `  feature  ${feature.paths.featureJson}`,
    `  fixture  ${feature.paths.fixture}`,
    `  camera   ${feature.paths.camera}`,
    `  taps     ${feature.paths.taps}`,
    `  layout   ${feature.paths.layout}`,
    'capture:',
    `  interaction ${feature.capture.interaction || 'none'}`,
    `  readyMarker ${feature.capture.readyMarker}`,
    `  requiredMarkers ${JSON.stringify(feature.capture.requiredMarkers)}`,
    `  waitAfterReadyMs ${feature.capture.waitAfterReadyMs}`,
    `  startMarker ${feature.capture.startMarker || 'none'}`,
    `  endMarker ${feature.capture.endMarker || 'none'}`,
    `  steps ${
      feature.capture.steps
        ? feature.capture.steps.map((step) => step.id).join(',')
        : 'none'
    }`,
    `  startOffsetSeconds ${feature.capture.startOffsetSeconds}`,
    `  endCushionSeconds ${feature.capture.endCushionSeconds}`,
    'compose:',
    `  holdSeconds ${feature.compose.holdSeconds}`,
    `layout preflight ${layout.source}${layout.note ? ` (${layout.note})` : ''}`,
  ];
  if (feature.knownLimitations.length) {
    lines.push('known limitations:');
    for (const item of feature.knownLimitations) {
      lines.push(`  - ${item}`);
    }
  }
  lines.push(
    `scene adapter: wired scenes are ${SUPPORTED_SCENES.join(
      ', ',
    )}. Copying this JSON does not drive other native pages.`,
  );
  return lines.join('\n');
}

function takeRawHash(take) {
  if (typeof take.rawHash === 'string' && take.rawHash) return take.rawHash;
  if (typeof take.source?.rawHash === 'string' && take.source.rawHash) {
    return take.source.rawHash;
  }
  return null;
}

export function resolveTakeRef(ref, { featureId } = {}) {
  if (ref === 'latest') {
    if (!featureId) {
      throw configError('--take latest requires a feature-id');
    }
    return pickLatestSuccessfulTake(featureId);
  }
  const resolved = path.resolve(ref);
  if (!fs.existsSync(resolved)) {
    throw configError(`--take not found: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  const takePath = stat.isDirectory()
    ? path.join(resolved, 'take.json')
    : resolved;
  return loadSuccessfulTake(takePath);
}

export function loadSuccessfulTake(takePath) {
  if (!fs.existsSync(takePath)) {
    throw configError(`take.json not found: ${takePath}`);
  }
  const take = readJsonFile(takePath, takePath);
  const takeDir = path.dirname(takePath);
  const siblingRaw = path.join(takeDir, 'raw.mp4');
  let rawPath = siblingRaw;
  if (!fs.existsSync(rawPath) && typeof take.rawPath === 'string') {
    rawPath = take.rawPath;
  }
  if (!fs.existsSync(rawPath)) {
    throw configError(`raw.mp4 missing for take: ${takePath}`);
  }
  const expected = takeRawHash(take);
  if (!expected) {
    throw configError(`take is missing rawHash: ${takePath}`);
  }
  const actual = sha256File(rawPath);
  if (actual !== expected) {
    throw configError(
      `raw sha256 mismatch for ${rawPath}: take=${expected} file=${actual}`,
    );
  }
  if (
    typeof take.video?.startSeconds !== 'number' ||
    !Number.isFinite(take.video.startSeconds) ||
    typeof take.video?.actualEndSeconds !== 'number' ||
    !Number.isFinite(take.video.actualEndSeconds)
  ) {
    throw configError(`take.video start/actualEnd missing: ${takePath}`);
  }
  return {
    takePath,
    takeDir,
    rawPath,
    rawHash: actual,
    take,
  };
}

export function listSuccessfulTakes(
  featureId,
  { takesDir = featureTakesDir(featureId) } = {},
) {
  const root = takesDir;
  if (!fs.existsSync(root)) {
    return [];
  }
  const names = fs
    .readdirSync(root)
    .filter((name) => fs.statSync(path.join(root, name)).isDirectory())
    .toSorted();
  const found = [];
  for (const name of names) {
    const takePath = path.join(root, name, 'take.json');
    try {
      found.push(loadSuccessfulTake(takePath));
    } catch {
      // Failed or incomplete takes are skipped for `latest`.
    }
  }
  return found;
}

export function pickLatestSuccessfulTake(featureId, options = {}) {
  const takes = listSuccessfulTakes(featureId, options);
  if (!takes.length) {
    throw configError(
      `No successful take for feature ${JSON.stringify(
        featureId,
      )} under ${featureTakesDir(featureId)}`,
    );
  }
  return takes[takes.length - 1];
}

export function readGitState(cwd = REPO_ROOT) {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  });
  const porcelain = spawnSync('git', ['status', '--porcelain'], {
    cwd,
    encoding: 'utf8',
  });
  if (head.status !== 0) {
    return { head: null, dirty: null, status: [] };
  }
  const status = `${porcelain.stdout || ''}`
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);
  return {
    head: head.stdout.trim(),
    dirty: status.length > 0,
    status,
  };
}

export function toolSourceManifest(root = PRIME_DEMO_ROOT) {
  const files = [];
  for (const rel of TOOL_SOURCE_FILES) {
    const filePath = path.join(root, rel);
    if (!fs.existsSync(filePath)) {
      files.push({ path: rel, sha256: null, missing: true });
    } else {
      files.push({ path: rel, sha256: sha256File(filePath), missing: false });
    }
  }
  const present = files
    .filter((file) => !file.missing)
    .map((file) => `${file.path}:${file.sha256}`)
    .join('\n');
  return {
    sha256: sha256Buffer(present),
    files,
  };
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

export function posixRelative(fromDir, toPath) {
  const rel = path.relative(path.resolve(fromDir), path.resolve(toPath));
  if (!rel) return '.';
  return rel.split(path.sep).join('/');
}

export function resolvePosixRelative(fromDir, rel) {
  return path.resolve(fromDir, String(rel).split('/').join(path.sep));
}

function snapshotRawRecord(snapshotDir, takeRecord) {
  if (!takeRecord) return null;
  return {
    path: takeRecord.rawPath,
    relativePath: posixRelative(snapshotDir, takeRecord.rawPath),
    sha256: takeRecord.rawHash,
  };
}

export function resolveRelocatedRaw(ref) {
  const resolved = path.resolve(ref);
  if (!fs.existsSync(resolved)) {
    throw configError(`--take not found: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  const takeDir = stat.isDirectory() ? resolved : path.dirname(resolved);
  const sibling = path.join(takeDir, 'raw.mp4');
  if (fs.existsSync(sibling) && fs.statSync(sibling).isFile()) {
    return sibling;
  }
  if (!stat.isDirectory()) {
    const take = readJsonFile(resolved, resolved);
    if (typeof take.rawPath === 'string' && fs.existsSync(take.rawPath)) {
      return take.rawPath;
    }
  }
  throw configError(`raw.mp4 missing for relocated take: ${resolved}`);
}

export function writeSnapshotDir(
  destDir,
  { kind, feature, takeRecord = null, compose = null, overrides = null },
) {
  fs.mkdirSync(destDir, { recursive: true });
  copyFile(feature.paths.featureJson, path.join(destDir, 'feature.json'));
  copyFile(feature.paths.fixture, path.join(destDir, 'fixture.json'));
  copyFile(feature.paths.camera, path.join(destDir, 'camera.json'));
  copyFile(feature.paths.taps, path.join(destDir, 'taps.json'));
  copyFile(feature.paths.layout, path.join(destDir, 'layout.json'));
  fs.writeFileSync(
    path.join(destDir, 'capture-config.json'),
    `${JSON.stringify(feature.capture, null, 2)}\n`,
  );
  if (takeRecord) {
    copyFile(takeRecord.takePath, path.join(destDir, 'take.json'));
  }
  const tools = toolSourceManifest();
  const snapshot = {
    schemaVersion: 1,
    kind,
    featureId: feature.id,
    scene: feature.scene,
    createdAt: new Date().toISOString(),
    git: readGitState(),
    tools: {
      sourceHash: tools.sha256,
      files: tools.files,
    },
    knownLimitations: feature.knownLimitations,
    paths: {
      feature: 'feature.json',
      fixture: 'fixture.json',
      camera: 'camera.json',
      taps: 'taps.json',
      layout: 'layout.json',
      captureConfig: 'capture-config.json',
      take: takeRecord ? 'take.json' : null,
    },
    raw: snapshotRawRecord(destDir, takeRecord),
    take: takeRecord
      ? {
          path: takeRecord.takePath,
          rawHash: takeRecord.rawHash,
          matchedSceneKey: takeRecord.take.matchedSceneKey ?? null,
          startSeconds: takeRecord.take.video.startSeconds,
          requestedEndSeconds: takeRecord.take.video.requestedEndSeconds,
          actualEndSeconds: takeRecord.take.video.actualEndSeconds,
          holdSeconds: takeRecord.take.video.holdSeconds,
        }
      : null,
    compose,
    overrides,
  };
  fs.writeFileSync(
    path.join(destDir, 'snapshot.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );
  return snapshot;
}

export function finalizeSnapshotDir(
  snapshotDir,
  { takeRecord, compose, overrides } = {},
) {
  const existing = loadSnapshotDir(snapshotDir);
  if (takeRecord) {
    copyFile(takeRecord.takePath, path.join(snapshotDir, 'take.json'));
  }
  const meta = {
    ...existing.meta,
    paths: {
      ...existing.meta.paths,
      take: takeRecord ? 'take.json' : existing.meta.paths.take,
    },
    raw: takeRecord
      ? snapshotRawRecord(snapshotDir, takeRecord)
      : existing.meta.raw,
    take: takeRecord
      ? {
          path: takeRecord.takePath,
          rawHash: takeRecord.rawHash,
          matchedSceneKey: takeRecord.take.matchedSceneKey ?? null,
          startSeconds: takeRecord.take.video.startSeconds,
          requestedEndSeconds: takeRecord.take.video.requestedEndSeconds,
          actualEndSeconds: takeRecord.take.video.actualEndSeconds,
          holdSeconds: takeRecord.take.video.holdSeconds,
        }
      : existing.meta.take,
    compose: compose === undefined ? existing.meta.compose : compose,
    overrides: overrides === undefined ? existing.meta.overrides : overrides,
  };
  fs.writeFileSync(
    path.join(snapshotDir, 'snapshot.json'),
    `${JSON.stringify(meta, null, 2)}\n`,
  );
  return meta;
}

export function loadSnapshotDir(snapshotDir) {
  const dir = path.resolve(snapshotDir);
  const metaPath = path.join(dir, 'snapshot.json');
  if (!fs.existsSync(metaPath)) {
    throw configError(`snapshot.json not found: ${metaPath}`);
  }
  const meta = readJsonFile(metaPath, metaPath);
  const file = (rel) => path.join(dir, rel);
  return {
    dir,
    meta,
    paths: {
      featureJson: file('feature.json'),
      fixture: file('fixture.json'),
      camera: file('camera.json'),
      taps: file('taps.json'),
      layout: file('layout.json'),
      captureConfig: file('capture-config.json'),
      take: fs.existsSync(file('take.json')) ? file('take.json') : null,
    },
  };
}

function requireRawHash(rawPath, expected, source) {
  if (!fs.existsSync(rawPath) || !fs.statSync(rawPath).isFile()) {
    throw configError(`snapshot raw missing (${source}): ${rawPath}`);
  }
  const actual = sha256File(rawPath);
  if (actual !== expected) {
    throw configError(
      `snapshot raw sha256 mismatch (${source}): ${rawPath} snapshot=${expected} file=${actual}`,
    );
  }
  return { rawPath, rawHash: actual, source };
}

export function assertRawMatchesSnapshot(
  snapshot,
  { relocateRaw = null } = {},
) {
  const expected = snapshot.meta.raw?.sha256;
  if (!expected) {
    throw configError('snapshot is missing raw sha256');
  }
  if (relocateRaw) {
    return requireRawHash(
      resolveRelocatedRaw(relocateRaw),
      expected,
      'relocated',
    );
  }
  const relativeRel = snapshot.meta.raw?.relativePath;
  if (typeof relativeRel === 'string' && relativeRel) {
    const relativePath = resolvePosixRelative(snapshot.dir, relativeRel);
    if (fs.existsSync(relativePath)) {
      return requireRawHash(relativePath, expected, 'relative');
    }
  }
  const absolute = snapshot.meta.raw?.path;
  if (typeof absolute === 'string' && absolute && fs.existsSync(absolute)) {
    return requireRawHash(absolute, expected, 'absolute');
  }
  throw configError(
    `snapshot raw missing: relative=${relativeRel || 'none'} path=${absolute || 'none'}`,
  );
}

export function loadFeatureFromSnapshot(snapshot) {
  return loadFeatureFromFiles({
    featureJson: snapshot.paths.featureJson,
    fixture: snapshot.paths.fixture,
    camera: snapshot.paths.camera,
    taps: snapshot.paths.taps,
    layout: snapshot.paths.layout,
  });
}

function loadFeatureFromFiles({ featureJson, fixture, camera, taps, layout }) {
  const raw = readJsonFile(featureJson, featureJson);
  const featureDir = path.dirname(featureJson);
  const id = requireString(raw.id, 'feature.id');
  const scene = requireString(raw.scene, 'feature.scene');
  if (!SUPPORTED_SCENES.includes(scene)) {
    throw configError(
      `Unsupported scene ${JSON.stringify(scene)} in snapshot feature.json`,
    );
  }
  return {
    id,
    title: requireString(raw.title, 'feature.title'),
    scene,
    schemaVersion: raw.schemaVersion,
    raw,
    paths: {
      featureDir,
      featureJson,
      fixture,
      camera,
      taps,
      layout,
    },
    capture: parseCaptureBlock(raw.capture),
    compose: parseComposeBlock(raw.compose),
    knownLimitations: KNOWN_LIMITATIONS[scene] || [],
  };
}
