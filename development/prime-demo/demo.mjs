#!/usr/bin/env node
/**
 * Feature CLI for local Prime demo capture/render/replay.
 * Position: <command> [feature-id|render-dir] then flags.
 * Wired native scene adapters: signguard-permit2, transaction-security-check.
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOOL_VERSION as COMPOSE_TOOL_VERSION } from './compose.mjs';
import { runDoctor, setupSimulator } from './environment.mjs';
import { exportMaster } from './export.mjs';
import {
  FeatureConfigError,
  REPO_ROOT,
  assertRawMatchesSnapshot,
  checkFeature,
  featureRendersDir,
  featureTakesDir,
  finalizeSnapshotDir,
  formatCheckReport,
  listFeatures,
  loadFeature,
  loadFeatureFromSnapshot,
  loadSnapshotDir,
  loadSuccessfulTake,
  newTimestampId,
  readJsonFile,
  resolveTakeRef,
  toolSourceManifest,
  writeSnapshotDir,
} from './feature.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RUN_PATH = path.join(SCRIPT_DIR, 'run.mjs');
const COMPOSE_PATH = path.join(SCRIPT_DIR, 'compose.mjs');

class UsageError extends Error {}

function printUsage() {
  console.log(`Prime demo feature CLI.

Usage:
  node development/prime-demo/demo.mjs <command> [target] [options]

Commands:
  list                         List features under features/
  check <feature-id>           Read-only preflight; print resolved paths
  record <feature-id>          Native capture + compose (does not reuse services)
  render <feature-id> --take <take.json|dir|latest> [--hold 4] [--no-taps]
                               Post from an existing take. Never recaptures.
  replay <render-dir> [--take <take-dir|take.json>]
                               Re-compose from that render's snapshot, not current feature JSON
  export <master.mp4> [--output <dir>] [--crf 23]
                               Compress a composed master to video.mp4, poster.png, export.json
  doctor [post|record]         Read-only environment check (default post)
  setup [--runtime <id>]       Find or create the dedicated iPhone 15 Pro simulator; do not boot
  build-ios [--udid <id>] [--install-pods]
                               Explicit simulator Debug build recipe (does not run doctor/setup).
                               Always runs locked pod install --deployment; restores lock and project.

Options:
  --take <ref>     render: take.json, take dir, or latest; replay: relocate raw only
  --hold <sec>     compose hold override for render (record uses feature.compose.holdSeconds)
  --no-taps        render without the tap overlay
  --udid <id>      record/build-ios: simulator UDID (else PRIME_DEMO_UDID or output/.environment.json)
  --app-path <p>   record: signed Debug .app (else PRIME_DEMO_APP_PATH, saved, or .tmp package)
  --output <dir>   export only: new directory (default: <master-dir>/deliveries/<timestamp>)
  --crf <n>        export only: H.264 CRF 0-51 (default: 23)
  --runtime <id>   setup only: installed simctl runtime id (default prefer iOS-26-5)
  --install-pods   build-ios only: no-op compatibility alias; locked pod install always runs
  --help           Show this help

Position: command, then feature-id (check/record/render), render-dir (replay), master.mp4 (export), or doctor mode.
Environment file: development/prime-demo/output/.environment.json
Doctor/setup/build-ios are local helpers; they are not fully cross-platform tested.
Wired scenes: signguard-permit2, transaction-security-check. Copying feature JSON does not drive other pages.
record never passes --reuse-services (avoids mixing an already-running fixture).
Old node development/prime-demo/run.mjs remains compatible.

Known limitation (signguard-permit2): the first ~0.6s of the composed clip may
show the confirmation title before the sheet body settles. Not fixed here.
`);
}

function parseNumber(name, raw) {
  if (typeof raw === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)) {
    throw new UsageError(
      `--${name} must be a finite number, got ${JSON.stringify(raw)}`,
    );
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new UsageError(`--${name} must be a finite number`);
  }
  return n;
}

function parseCrf(raw) {
  if (typeof raw === 'string' && !/^\d+$/.test(raw)) {
    throw new UsageError(
      `--crf must be an integer 0-51, got ${JSON.stringify(raw)}`,
    );
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 51) {
    throw new UsageError(
      `--crf must be an integer 0-51, got ${JSON.stringify(raw)}`,
    );
  }
  return n;
}

export function parseDemoArgs(argv) {
  const options = {
    help: false,
    command: null,
    target: null,
    take: null,
    hold: null,
    noTaps: false,
    udid: null,
    appPath: null,
    output: null,
    crf: null,
    runtime: null,
    installPods: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--no-taps') {
      options.noTaps = true;
    } else if (arg === '--install-pods') {
      options.installPods = true;
    } else if (arg.startsWith('--')) {
      const eq = arg.match(/^--([a-z0-9-]+)=(.*)$/s);
      let key;
      let value;
      if (eq) {
        key = eq[1];
        value = eq[2];
      } else {
        key = arg.slice(2);
        value = argv[i + 1];
        if (value === undefined || value.startsWith('--')) {
          throw new UsageError(`Missing value for --${key}`);
        }
        i += 1;
      }
      if (key === 'take') {
        options.take = value;
      } else if (key === 'hold') {
        options.hold = parseNumber('hold', value);
      } else if (key === 'udid') {
        options.udid = value;
      } else if (key === 'app-path') {
        options.appPath = value;
      } else if (key === 'output') {
        options.output = value;
      } else if (key === 'crf') {
        options.crf = parseCrf(value);
      } else if (key === 'runtime') {
        options.runtime = value;
      } else {
        throw new UsageError(`Unknown option --${key}`);
      }
    } else if (!options.command) {
      options.command = arg;
    } else if (!options.target) {
      options.target = arg;
    } else {
      throw new UsageError(`Unexpected argument: ${arg}`);
    }
    i += 1;
  }

  if (options.command === 'export') {
    if (options.take !== null) {
      throw new UsageError('export does not accept --take');
    }
    if (options.hold !== null) {
      throw new UsageError('export does not accept --hold');
    }
    if (options.noTaps) {
      throw new UsageError('export does not accept --no-taps');
    }
    if (options.udid !== null) {
      throw new UsageError('export does not accept --udid');
    }
    if (options.appPath !== null) {
      throw new UsageError('export does not accept --app-path');
    }
  } else if (options.command) {
    if (options.output !== null) {
      throw new UsageError('--output is only valid for export');
    }
    if (options.crf !== null) {
      throw new UsageError('--crf is only valid for export');
    }
  }
  if (
    options.command &&
    options.take !== null &&
    options.command !== 'export' &&
    options.command !== 'render' &&
    options.command !== 'replay'
  ) {
    throw new UsageError('--take is only valid for render and replay');
  }
  if (options.command && options.command !== 'setup' && options.runtime) {
    throw new UsageError('--runtime is only valid for setup');
  }
  if (
    options.command &&
    options.command !== 'build-ios' &&
    options.installPods
  ) {
    throw new UsageError('--install-pods is only valid for build-ios');
  }

  return options;
}

function requireTarget(options, label) {
  if (!options.target) {
    let needed = '<feature-id>';
    if (label === 'replay') needed = '<render-dir>';
    if (label === 'export') needed = '<master.mp4>';
    if (label === 'doctor') needed = 'post|record';
    throw new UsageError(`${label} requires ${needed}`);
  }
  return options.target;
}

function runNode(
  scriptPath,
  args,
  { cwd = REPO_ROOT, env = process.env } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${path.basename(scriptPath)} exited ${code}${
            signal ? ` signal=${signal}` : ''
          }`,
        ),
      );
    });
  });
}

export function buildRecordRunArgs({
  snapshotDir,
  takeDir,
  udid = null,
  appPath = null,
}) {
  const snapshot = loadSnapshotDir(snapshotDir);
  const frozen = loadFeatureFromSnapshot(snapshot);
  const args = [
    '--hold',
    String(frozen.compose.holdSeconds),
    '--fixture',
    snapshot.paths.fixture,
    '--camera',
    snapshot.paths.camera,
    '--taps',
    snapshot.paths.taps,
    '--layout',
    snapshot.paths.layout,
    '--capture-config',
    snapshot.paths.captureConfig,
    '--take-dir',
    takeDir,
  ];
  if (frozen.capture.interaction) {
    args.push('--interaction', frozen.capture.interaction);
  }
  if (udid) {
    args.push('--udid', udid);
  }
  if (appPath) {
    args.push('--app-path', appPath);
  }
  return args;
}

export function buildComposeArgsFromSnapshot(
  snapshot,
  { input, output, poster, start, end, hold, tapsEnabled },
) {
  return {
    input,
    output,
    poster,
    start,
    end,
    hold,
    camera: snapshot.paths.camera,
    taps: tapsEnabled ? snapshot.paths.taps : null,
    take: snapshot.paths.take,
    layout: snapshot.paths.layout,
  };
}

function runCompose({
  input,
  output,
  poster,
  start,
  end,
  hold,
  camera,
  taps,
  take,
  layout,
}) {
  const args = [
    COMPOSE_PATH,
    '--input',
    input,
    '--output',
    output,
    '--start',
    String(start),
    '--end',
    String(end),
    '--hold',
    String(hold),
  ];
  if (poster) {
    args.push('--poster', poster);
  }
  if (camera) {
    args.push('--camera', camera);
  }
  if (taps) {
    args.push('--taps', taps);
  }
  if (take) {
    args.push('--take', take);
  }
  if (layout) {
    args.push('--layout', layout);
  }
  console.log(`compose ${args.slice(1).join(' ')}`);
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(
      `compose.mjs failed (code=${result.status}): ${
        result.stderr || result.stdout || ''
      }`.trim(),
    );
  }
}

function writeRenderJson(renderDir, payload) {
  const filePath = path.join(renderDir, 'render.json');
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return filePath;
}

function listCommand() {
  const features = listFeatures();
  if (!features.length) {
    console.log('No features found.');
    return;
  }
  for (const feature of features) {
    console.log(
      `${feature.id}\t${feature.scene}\t${feature.title}\t${feature.featurePath}`,
    );
  }
}

async function checkCommand(featureId) {
  const result = await checkFeature(featureId);
  console.log(formatCheckReport(result));
}

async function recordCommand(options) {
  const featureId = requireTarget(options, 'record');
  await checkFeature(featureId);
  const feature = loadFeature(featureId);
  const takeDir = path.join(featureTakesDir(featureId), newTimestampId());
  fs.mkdirSync(takeDir, { recursive: true });
  const snapshotDir = path.join(takeDir, 'snapshot');
  writeSnapshotDir(snapshotDir, {
    kind: 'take',
    feature,
    compose: {
      hold: feature.compose.holdSeconds,
      tapsEnabled: true,
    },
  });
  const runArgs = buildRecordRunArgs({
    snapshotDir,
    takeDir,
    udid: options.udid,
    appPath: options.appPath,
  });
  console.log(`record ${featureId}`);
  console.log(`takeDir ${takeDir}`);
  console.log('record does not pass --reuse-services (old run.mjs still can).');
  await runNode(RUN_PATH, runArgs);
  const demoMp4 = path.join(takeDir, 'demo.mp4');
  const takeJson = path.join(takeDir, 'take.json');
  const rawPath = path.join(takeDir, 'raw.mp4');
  if (!fs.existsSync(takeJson) || !fs.existsSync(rawPath)) {
    throw new FeatureConfigError(
      `record did not write take.json/raw.mp4 under ${takeDir}`,
    );
  }
  const takeRecord = loadSuccessfulTake(takeJson);
  finalizeSnapshotDir(snapshotDir, {
    takeRecord,
    compose: {
      start: takeRecord.take.video.startSeconds,
      end: takeRecord.take.video.actualEndSeconds,
      hold: takeRecord.take.video.holdSeconds,
      tapsEnabled: true,
      camera: 'camera.json',
      taps: 'taps.json',
      layout: 'layout.json',
      take: 'take.json',
    },
  });
  console.log(`recorded ${featureId}`);
  console.log(`take ${takeDir}`);
  console.log(`  raw ${rawPath}`);
  console.log(`  take.json ${takeJson}`);
  console.log(`  snapshot ${snapshotDir}`);
  if (fs.existsSync(demoMp4)) {
    console.log(`final product ${demoMp4}`);
  } else {
    console.log(
      'raw take written; compose output was not produced in this take dir',
    );
  }
}

function composeFromTake({
  feature,
  takeRecord,
  renderDir,
  hold,
  tapsEnabled,
  overrides,
}) {
  fs.mkdirSync(renderDir, { recursive: true });
  const output = path.join(renderDir, 'demo.mp4');
  const poster = path.join(renderDir, 'demo.png');
  const start = takeRecord.take.video.startSeconds;
  const end = takeRecord.take.video.actualEndSeconds;
  const snapshotDir = path.join(renderDir, 'snapshot');
  const snapshotMeta = writeSnapshotDir(snapshotDir, {
    kind: 'render',
    feature,
    takeRecord,
    compose: {
      start,
      end,
      hold,
      tapsEnabled,
      camera: 'camera.json',
      taps: 'taps.json',
      layout: 'layout.json',
      take: 'take.json',
    },
    overrides,
  });
  const snapshot = loadSnapshotDir(snapshotDir);
  runCompose(
    buildComposeArgsFromSnapshot(snapshot, {
      input: takeRecord.rawPath,
      output,
      poster,
      start,
      end,
      hold,
      tapsEnabled,
    }),
  );
  const currentTools = toolSourceManifest();
  const renderJson = writeRenderJson(renderDir, {
    featureId: feature.id,
    scene: feature.scene,
    renderDir,
    takePath: takeRecord.takePath,
    rawPath: takeRecord.rawPath,
    rawHash: takeRecord.rawHash,
    start,
    end,
    hold,
    tapsEnabled,
    camera: snapshot.paths.camera,
    layout: snapshot.paths.layout,
    snapshotDir,
    composed: {
      mp4: output,
      png: poster,
      json: output.replace(/\.mp4$/u, '.json'),
    },
    tools: {
      composeVersion: COMPOSE_TOOL_VERSION,
      sourceHash: currentTools.sha256,
      snapshotSourceHash: snapshotMeta.tools.sourceHash,
      sourceHashMatchesSnapshot:
        currentTools.sha256 === snapshotMeta.tools.sourceHash,
    },
    git: snapshotMeta.git,
    overrides,
    knownLimitations: feature.knownLimitations,
    createdAt: snapshotMeta.createdAt,
  });
  console.log(`render ${renderDir}`);
  console.log(`final product ${output}`);
  console.log(`render.json ${renderJson}`);
  return renderDir;
}

async function renderCommand(options) {
  const featureId = requireTarget(options, 'render');
  if (!options.take) {
    throw new UsageError('render requires --take <take.json|dir|latest>');
  }
  await checkFeature(featureId);
  const feature = loadFeature(featureId);
  const takeRecord = resolveTakeRef(options.take, { featureId });
  const hold =
    options.hold === null ? feature.compose.holdSeconds : options.hold;
  if (hold < 0) {
    throw new UsageError(`--hold must be >= 0, got ${hold}`);
  }
  const renderDir = path.join(featureRendersDir(featureId), newTimestampId());
  composeFromTake({
    feature,
    takeRecord,
    renderDir,
    hold,
    tapsEnabled: !options.noTaps,
    overrides: {
      hold: options.hold,
      noTaps: options.noTaps,
    },
  });
}

function findSnapshotDir(renderDir) {
  const nested = path.join(renderDir, 'snapshot', 'snapshot.json');
  if (fs.existsSync(nested)) {
    return path.join(renderDir, 'snapshot');
  }
  if (fs.existsSync(path.join(renderDir, 'snapshot.json'))) {
    return renderDir;
  }
  throw new FeatureConfigError(
    `No snapshot.json under ${renderDir} (expected snapshot/snapshot.json)`,
  );
}

function replayCommand(options) {
  if (options.hold !== null || options.noTaps) {
    throw new UsageError(
      'replay uses the frozen snapshot only; do not pass --hold/--no-taps',
    );
  }
  if (options.udid || options.appPath) {
    throw new UsageError('replay does not accept --udid/--app-path');
  }
  if (options.take === 'latest') {
    throw new UsageError(
      'replay --take must be a take directory or take.json, not latest',
    );
  }
  const renderDirArg = requireTarget(options, 'replay');
  const snapshot = loadSnapshotDir(findSnapshotDir(renderDirArg));
  const { rawPath } = assertRawMatchesSnapshot(snapshot, {
    relocateRaw: options.take,
  });
  const currentTools = toolSourceManifest();
  if (snapshot.meta.tools?.sourceHash !== currentTools.sha256) {
    console.log(
      `tool source hash differs from snapshot (snapshot=${snapshot.meta.tools?.sourceHash} current=${currentTools.sha256}). Replay uses the current compose tool; byte-identical output across versions is not claimed.`,
    );
  }
  if (!snapshot.paths.take) {
    throw new FeatureConfigError(
      'snapshot is missing take.json; cannot replay',
    );
  }
  const take = readJsonFile(snapshot.paths.take, snapshot.paths.take);
  const takeRecord = {
    takePath: snapshot.paths.take,
    takeDir: path.dirname(snapshot.paths.take),
    rawPath,
    rawHash: snapshot.meta.raw.sha256,
    take,
  };
  const compose = snapshot.meta.compose || {};
  const hold = compose.hold;
  const start = compose.start;
  const end = compose.end;
  if (
    typeof hold !== 'number' ||
    typeof start !== 'number' ||
    typeof end !== 'number'
  ) {
    throw new FeatureConfigError(
      'snapshot.compose is missing start/end/hold; cannot replay',
    );
  }
  const featureId = snapshot.meta.featureId;
  const feature = loadFeatureFromSnapshot(snapshot);
  const outDir = path.join(featureRendersDir(featureId), newTimestampId());
  composeFromTake({
    feature,
    takeRecord: {
      ...takeRecord,
      take: {
        ...takeRecord.take,
        video: {
          ...takeRecord.take.video,
          startSeconds: start,
          actualEndSeconds: end,
        },
      },
    },
    renderDir: outDir,
    hold,
    tapsEnabled: Boolean(compose.tapsEnabled),
    overrides: snapshot.meta.overrides || null,
  });
}

async function doctorCommand(options) {
  const mode = options.target || 'post';
  if (mode !== 'post' && mode !== 'record') {
    throw new UsageError('doctor requires post or record');
  }
  const result = await runDoctor(mode, {
    udid: options.udid,
    appPath: options.appPath,
  });
  console.log(result.report);
  if (!result.ok) {
    throw new UsageError(`doctor ${mode} is not ready`);
  }
}

function setupCommand(options) {
  const result = setupSimulator({ runtimeId: options.runtime || null });
  console.log(
    `${result.created ? 'created' : 'reused'} ${result.deviceName} ${result.udid}`,
  );
  console.log(`runtime ${result.runtimeId}`);
  console.log(`environment ${result.path}`);
}

function buildIosCommand(options) {
  const scriptPath = path.join(SCRIPT_DIR, 'build-ios.sh');
  const args = [scriptPath];
  if (options.udid) {
    args.push('--udid', options.udid);
  }
  if (options.installPods) {
    args.push('--install-pods');
  }
  console.log(`build-ios ${args.slice(1).join(' ')}`.trim());
  const result = spawnSync('sh', args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`build-ios.sh exited ${result.status ?? 'null'}`);
  }
}

async function main() {
  let options;
  try {
    options = parseDemoArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      printUsage();
      process.exit(1);
    }
    throw error;
  }

  if (options.help || !options.command) {
    printUsage();
    return;
  }

  try {
    switch (options.command) {
      case 'list':
        listCommand();
        break;
      case 'check':
        await checkCommand(requireTarget(options, 'check'));
        break;
      case 'record':
        await recordCommand(options);
        break;
      case 'render':
        await renderCommand(options);
        break;
      case 'replay':
        replayCommand(options);
        break;
      case 'export':
        exportMaster({
          input: requireTarget(options, 'export'),
          outputDir: options.output,
          crf: options.crf ?? 23,
        });
        break;
      case 'doctor':
        await doctorCommand(options);
        break;
      case 'setup':
        setupCommand(options);
        break;
      case 'build-ios':
        buildIosCommand(options);
        break;
      default:
        throw new UsageError(`Unknown command: ${options.command}`);
    }
  } catch (error) {
    if (error instanceof UsageError || error instanceof FeatureConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  void main();
}
