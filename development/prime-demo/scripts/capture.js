#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const {
  ACCEPTED_INTERACTION,
  hasCaptureTour,
  loadCaptureConfigFile,
  resolveCaptureTiming,
  requiresAnimations,
  resolveRequestedEndOffsetSeconds,
  selectReadyCapture,
  selectSceneMarker,
} = require('./captureConfig');
const { applyHostDispatchTimes, runCaptureSteps } = require('./captureSteps');
const {
  applyScreenPointToRiskAckMarkers,
  readDetoxScreenFrame,
  screenPointFromFrame,
} = require('./riskCheckboxPoint');

const repoRoot = path.resolve(__dirname, '../../..');
const DEFAULT_UDID = '231FF367-DF91-4F64-AEB0-A56ABE437CBE';
const DEFAULT_APP_PATH = path.join(
  repoRoot,
  '.tmp/prime-demo/native/OneKeyWallet.app',
);
const DEFAULT_BUNDLE_ID = 'so.onekey.wallet';
const FIXTURE_ORIGIN = 'http://localhost:4737';
const DEFAULT_FIXTURE_PATH = path.join(
  repoRoot,
  'development/prime-demo/fixtures/permit2-uniswap.json',
);
const RISK_CHECKBOX_TEST_ID = 'sig-confirm-msg-risk-checkbox';
const RISK_CHECKBOX_TAP_LOCAL = { x: 10, y: 20 };
const RECORDING_STARTED_RE = /Recording started/i;
const LAUNCHER_TIMEOUT_MS = 180_000;
const TIMING_NOTES = {
  animationCallbacks:
    'LaserBorder/Shimmer onAnimationComplete fire through Reanimated runOnJS. Client tMs is JS performance.now() after the UI-thread worklet hop, not vsync presentation time. Expect about 1-2 frames plus JS queue delay versus the visible last animation frame.',
  hostAlignment:
    'compose --start is host wall-clock from simctl Recording started to startMarker (or sheetVisible/cardMounted) plus startOffsetSeconds (default -0.1s). Default requested --end is the configured ready marker plus 0.2s. With --interaction risk-checkbox or capture.steps, requested --end is endMarker (default riskAcknowledged for those tours) plus endCushionSeconds. Offsets come from --capture-config when provided. End is clamped to ffprobe last packet PTS because simctl VFR raw often has no duplicated frozen frames after the last encoded frame. host.animationsCompleteReceivedMs is kept when that marker exists.',
  interaction:
    '--interaction risk-checkbox waits waitAfterReadyMs after the configured ready marker (default animationsComplete + 2200ms), Detox-taps the risk checkbox at local {x:10,y:20}, then ends on the native riskAcknowledged marker. extra.point is Detox getAttributes().frame (iOS screen-relative) plus that local point; extra.reactRootPoint keeps RN pageX/pageY. Independent of --taps guide enabled. http driver is rejected. Confirm is never pressed. Camera compose always receives --take.',
  steps:
    'capture.steps is an ordered Detox tap list, mutually exclusive with interaction. After readyMarker + waitAfterReadyMs, each step waits for testID to be visible, reads getAttributes.frame, resolves a local point (explicit point, same-scene pointMarker extra.localPoint, or frame center), POSTs a host marker named step.id immediately before the Detox tap so fixture-server receivedAtMs is the dispatch clock, then waits for exactly one of waitForMarker / waitForTestID / waitForGoneTestID. holdMs is a reading pause after that proven state. Step.id markers are host-dispatched click clocks, not native UI-state callbacks; take.json rewrites those receivedAtMs from extra.hostTapMs. Guides may use marker=step.id. Missing steps fail the capture. Confirm is never pressed. Independent of --taps enabled.',
  reduceMotion:
    'Capture disables and checks Reduce Motion only when readiness requires animation markers. Animation-complete callbacks do not fire on the reduced-motion skip path.',
};

function parseArgs(argv) {
  const args = {
    udid: null,
    appPath: null,
    bundleId: process.env.PRIME_DEMO_BUNDLE_ID || DEFAULT_BUNDLE_ID,
    driver: 'detox',
    hold: 2,
    compose: true,
    camera: process.env.PRIME_DEMO_CAMERA || null,
    taps: null,
    interaction: null,
    fixture: process.env.PRIME_DEMO_FIXTURE_PATH || null,
    takeDir: null,
    captureConfig: null,
    layout: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--udid') {
      args.udid = next;
      i += 1;
    } else if (arg === '--app-path') {
      args.appPath = path.resolve(next);
      i += 1;
    } else if (arg === '--bundle-id') {
      args.bundleId = next;
      i += 1;
    } else if (arg === '--driver') {
      args.driver = next;
      i += 1;
    } else if (arg === '--hold') {
      args.hold = Number(next);
      i += 1;
    } else if (arg === '--camera') {
      args.camera = path.resolve(next);
      i += 1;
    } else if (arg === '--taps') {
      args.taps = path.resolve(next);
      i += 1;
    } else if (arg === '--interaction') {
      args.interaction = next;
      i += 1;
    } else if (arg === '--fixture') {
      args.fixture = path.resolve(next);
      i += 1;
    } else if (arg === '--take-dir') {
      args.takeDir = path.resolve(next);
      i += 1;
    } else if (arg === '--capture-config') {
      args.captureConfig = path.resolve(next);
      i += 1;
    } else if (arg === '--layout') {
      args.layout = path.resolve(next);
      i += 1;
    } else if (arg === '--skip-compose') {
      args.compose = false;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function usage() {
  return `Capture a Prime demo take, then compose it.

Usage:
  node development/prime-demo/scripts/capture.js [options]

Options:
  --udid <id>          Simulator UDID (else PRIME_DEMO_UDID, setup config; do not assume ${DEFAULT_UDID})
  --app-path <path>    Signed .app path (else PRIME_DEMO_APP_PATH, setup config, or ${path.relative(repoRoot, DEFAULT_APP_PATH)})
  --bundle-id <id>     Bundle id (default ${DEFAULT_BUNDLE_ID})
  --driver detox|http  Start trigger (default detox internals, taps prime-demo-start)
  --hold <seconds>     compose.mjs hold (default 2)
  --camera <json>      Pan keyframes JSON forwarded to compose
  --taps <json>        Tap-guide JSON forwarded to compose with --take
  --interaction <name> Optional capture action; only accepted value: risk-checkbox
  --fixture <json>     Fixture JSON (default PRIME_DEMO_FIXTURE_PATH or fixtures/permit2-uniswap.json)
  --take-dir <dir>     Write this take here (must not already contain raw.mp4)
  --capture-config <json>  Timing/interaction/steps overrides (wait/startOffset/endCushion/steps)
  --layout <json>      Forwarded to compose --layout
  --skip-compose       Write raw + take.json only

--interaction is independent of --taps enabled. Default is none (omit the flag).
risk-checkbox Detox-taps ${RISK_CHECKBOX_TEST_ID} at local ${JSON.stringify(
    RISK_CHECKBOX_TAP_LOCAL,
  )} after readyMarker + waitAfterReadyMs (default animationsComplete + 2200). Confirm is never pressed.
capture.steps is mutually exclusive with interaction. Each step is a real Detox tap; http is rejected.
--take is always forwarded to compose (camera depends on take even without taps).
--interaction and steps are rejected with --driver http (no true click path).
Default startOffsetSeconds=-0.1, endCushionSeconds=0.5 with risk-checkbox else 0.2.
`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestJson(url, { method = 'GET', body } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method,
        headers: body
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            }
          : undefined,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`${method} ${url} -> ${res.statusCode} ${raw}`));
            return;
          }
          try {
            resolve(raw ? JSON.parse(raw) : {});
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
    );
  }
  return result;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function disableReduceMotion(udid) {
  run('xcrun', [
    'simctl',
    'spawn',
    udid,
    'defaults',
    'write',
    'com.apple.Accessibility',
    'ReduceMotionEnabled',
    '-bool',
    'false',
  ]);
}

function readReduceMotion(udid) {
  const result = spawnSync(
    'xcrun',
    [
      'simctl',
      'spawn',
      udid,
      'defaults',
      'read',
      'com.apple.Accessibility',
      'ReduceMotionEnabled',
    ],
    { encoding: 'utf8' },
  );
  const text = `${result.stdout || ''}`.trim();
  return text === '1' || text.toLowerCase() === 'true';
}

async function waitForHealth(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const health = await requestJson(`${FIXTURE_ORIGIN}/health`);
      if (health.ok) {
        return;
      }
    } catch {
      // keep polling
    }
    await sleep(200);
  }
  throw new Error(
    `Fixture server is not reachable at ${FIXTURE_ORIGIN}/health`,
  );
}

async function waitForMarker(name, timeoutMs, { sceneKey } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payload = await requestJson(`${FIXTURE_ORIGIN}/markers`);
    const match = selectSceneMarker(payload.markers || [], name, sceneKey);
    if (match) {
      return { marker: match, markers: payload.markers || [] };
    }
    await sleep(100);
  }
  throw new Error(
    `Timed out waiting for marker "${name}"${
      sceneKey ? ` scene ${JSON.stringify(sceneKey)}` : ''
    }`,
  );
}

async function waitForReadyCapture(timing, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = `Missing ready marker "${timing.readyMarker}"`;
  while (Date.now() < deadline) {
    const payload = await requestJson(`${FIXTURE_ORIGIN}/markers`);
    try {
      const selected = selectReadyCapture(payload.markers || [], {
        readyMarker: timing.readyMarker,
        requiredMarkers: timing.requiredMarkers,
      });
      return {
        ...selected,
        markers: payload.markers || [],
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(100);
  }
  throw new Error(
    `Timed out waiting for ready "${timing.readyMarker}": ${lastError}`,
  );
}

function startRecording(udid, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'xcrun',
      [
        'simctl',
        'io',
        udid,
        'recordVideo',
        '--codec=h264',
        '--force',
        outputPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const session = {
      child,
      stdoutText: '',
      stderrText: '',
      exited: false,
      startedAtMs: 0,
    };
    let settled = false;
    const onData = (chunk, stream) => {
      const text = chunk.toString();
      if (stream === 'stdout') {
        session.stdoutText += text;
      } else {
        session.stderrText += text;
      }
      if (
        !settled &&
        RECORDING_STARTED_RE.test(
          `${session.stdoutText}\n${session.stderrText}`,
        )
      ) {
        settled = true;
        session.startedAtMs = Date.now();
        resolve(session);
      }
    };
    child.stdout.on('data', (chunk) => onData(chunk, 'stdout'));
    child.stderr.on('data', (chunk) => onData(chunk, 'stderr'));
    child.on('error', (error) => {
      if (!settled) {
        reject(error);
      }
    });
    child.on('exit', (code, signal) => {
      session.exited = true;
      if (!settled) {
        reject(
          new Error(
            `simctl recordVideo exited before Recording started (code=${code} signal=${signal})\n${session.stderrText}\n${session.stdoutText}`,
          ),
        );
      }
    });
  });
}

function stopRecording(session) {
  return new Promise((resolve) => {
    if (!session || !session.child) {
      resolve();
      return;
    }
    const { child } = session;
    if (session.exited) {
      resolve();
      return;
    }
    const finish = () => resolve();
    child.once('exit', finish);
    child.kill('SIGINT');
    setTimeout(() => {
      if (!session.exited) {
        child.kill('SIGKILL');
      }
    }, 2000);
  });
}

async function initDetox(udid, appPath) {
  process.env.SIMCTL_CHILD_ENABLE_NATIVE_BACKGROUND_THREAD = 'false';
  const detoxInternals = require('detox/internals');
  await detoxInternals.init({
    cwd: repoRoot,
    argv: { configuration: 'demo' },
    override: {
      configurations: {
        demo: { device: 'demo', app: 'demo' },
      },
      devices: {
        demo: {
          type: 'ios.simulator',
          device: { id: udid },
        },
      },
      apps: {
        demo: {
          type: 'ios.app',
          binaryPath: appPath,
        },
      },
      behavior: {
        init: { reinstallApp: false },
        cleanup: { shutdownDevice: false },
      },
      artifacts: {
        plugins: { video: 'none', screenshot: 'none' },
      },
      logger: { level: 'info' },
    },
  });
  const { device, element, by, waitFor } = require('detox');
  await device.launchApp({
    newInstance: true,
    launchArgs: {
      detoxEnableSynchronization: 0,
      // Keep Detox's touch circles out of the raw video; compose adds the guide.
      detoxDisableTouchIndicators: 1,
      ENABLE_NATIVE_BACKGROUND_THREAD: 'false',
    },
  });
  await device.disableSynchronization();
  await waitFor(element(by.id('prime-demo-start')))
    .toExist()
    .withTimeout(LAUNCHER_TIMEOUT_MS);
  return { detoxInternals, device, element, by, waitFor };
}

function pickSheetOpenMarker(markers, sceneKey) {
  return (
    selectSceneMarker(markers, 'sheetVisible', sceneKey) ||
    selectSceneMarker(markers, 'cardMounted', sceneKey)
  );
}

async function tapRiskCheckbox(detoxSession, log) {
  const { element, by, waitFor } = detoxSession;
  const target = element(by.id(RISK_CHECKBOX_TEST_ID));
  await waitFor(target).toExist().withTimeout(10_000);
  let attrs;
  try {
    attrs = await target.getAttributes();
  } catch (error) {
    throw new Error(
      `getAttributes failed for ${RISK_CHECKBOX_TEST_ID}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
  let frame;
  try {
    frame = readDetoxScreenFrame(attrs);
  } catch (error) {
    throw new Error(
      `Detox frame is not a reliable screen-relative rectangle for ${RISK_CHECKBOX_TEST_ID}: ${
        error instanceof Error ? error.message : String(error)
      }. getAttributes evidence: ${JSON.stringify(attrs)}`,
      { cause: error },
    );
  }
  const localPoint = { ...RISK_CHECKBOX_TAP_LOCAL };
  const screenPoint = screenPointFromFrame(frame, localPoint);
  log(
    `interaction ${ACCEPTED_INTERACTION}: getAttributes.frame ${JSON.stringify(
      frame,
    )} local ${JSON.stringify(localPoint)} screenPoint ${JSON.stringify(
      screenPoint,
    )} pointSource=detox-frame`,
  );
  log(
    `interaction ${ACCEPTED_INTERACTION}: Detox tap ${RISK_CHECKBOX_TEST_ID} at local ${JSON.stringify(
      localPoint,
    )} (checkbox only, not Confirm)`,
  );
  const hostTapMs = Date.now();
  await target.tap(localPoint);
  return {
    testID: RISK_CHECKBOX_TEST_ID,
    localPoint,
    frame,
    screenPoint,
    pointSource: 'detox-frame',
    coordinateSpace: 'device',
    hostTapMs,
  };
}

function createDetoxStepDriver(detoxSession, log) {
  const { element, by, waitFor } = detoxSession;
  return {
    selectSceneMarker,
    log,
    now: () => Date.now(),
    sleep,
    async waitVisible(testID, timeoutMs) {
      await waitFor(element(by.id(testID)))
        .toBeVisible()
        .withTimeout(timeoutMs);
    },
    async getAttributes(testID) {
      return element(by.id(testID)).getAttributes();
    },
    async tap(testID, localPoint) {
      await element(by.id(testID)).tap(localPoint);
    },
    async fetchMarkers() {
      return requestJson(`${FIXTURE_ORIGIN}/markers`);
    },
    async postMarker(payload) {
      return requestJson(`${FIXTURE_ORIGIN}/markers`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async waitMarker(name, timeoutMs, options) {
      return waitForMarker(name, timeoutMs, options);
    },
    async waitVisibleTestID(testID, timeoutMs) {
      await waitFor(element(by.id(testID)))
        .toBeVisible()
        .withTimeout(timeoutMs);
    },
    async waitGoneTestID(testID, timeoutMs) {
      await waitFor(element(by.id(testID)))
        .not.toBeVisible()
        .withTimeout(timeoutMs);
    },
  };
}

function ffprobeBin() {
  const fromEnv = process.env.FFPROBE;
  if (fromEnv) {
    return fromEnv;
  }
  const preferred = '/opt/homebrew/bin/ffprobe';
  return fs.existsSync(preferred) ? preferred : 'ffprobe';
}

function probeRawVideo(filePath) {
  const probe = ffprobeBin();
  const durationResult = spawnSync(
    probe,
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ],
    { encoding: 'utf8' },
  );
  const packetResult = spawnSync(
    probe,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'packet=pts_time',
      '-of',
      'csv=p=0',
      filePath,
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  const formatDurationSeconds = Number(durationResult.stdout.trim());
  if (durationResult.status !== 0 || packetResult.status !== 0) {
    throw new Error(
      `ffprobe failed: ${durationResult.stderr}${packetResult.stderr}`,
    );
  }
  const ptsValues = packetResult.stdout
    .split(/\s+/u)
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  let lastFramePtsSeconds = null;
  if (ptsValues.length) {
    lastFramePtsSeconds = Math.max(...ptsValues);
  } else if (Number.isFinite(formatDurationSeconds)) {
    lastFramePtsSeconds = formatDurationSeconds;
  }
  return {
    formatDurationSeconds: Number.isFinite(formatDurationSeconds)
      ? formatDurationSeconds
      : null,
    packetCount: ptsValues.length,
    lastFramePtsSeconds,
    stderr: `${durationResult.stderr || ''}${packetResult.stderr || ''}`,
  };
}

function secondsFromRecording(recordingStartedMs, eventMs, offsetSec) {
  return Math.max(0, (eventMs - recordingStartedMs) / 1000 + offsetSec);
}

function resolveFixturePath(args) {
  if (args.fixture) {
    return path.resolve(args.fixture);
  }
  if (process.env.PRIME_DEMO_FIXTURE_PATH) {
    return path.resolve(process.env.PRIME_DEMO_FIXTURE_PATH);
  }
  return DEFAULT_FIXTURE_PATH;
}

function resolveTakeDir(args) {
  if (args.takeDir) {
    const takeDir = path.resolve(args.takeDir);
    const rawPath = path.join(takeDir, 'raw.mp4');
    if (fs.existsSync(rawPath)) {
      throw new Error(`--take-dir already has raw.mp4: ${rawPath}`);
    }
    fs.mkdirSync(takeDir, { recursive: true });
    return { takeDir, takeId: path.basename(takeDir) };
  }
  const takeId = new Date().toISOString().replace(/[:.]/g, '-');
  const takeDir = path.join(
    repoRoot,
    'development/prime-demo/output/takes',
    takeId,
  );
  fs.mkdirSync(takeDir, { recursive: true });
  return { takeDir, takeId };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  const { resolveRecordTargets } = await import('../environment.mjs');
  try {
    const resolved = resolveRecordTargets({
      udid: args.udid,
      appPath: args.appPath,
    });
    args.udid = resolved.udid;
    args.appPath = resolved.appPath;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error), {
      cause: error,
    });
  }
  if (!['http', 'detox'].includes(args.driver)) {
    throw new Error('--driver must be http or detox');
  }
  if (args.taps && !fs.existsSync(args.taps)) {
    throw new Error(`--taps not found: ${args.taps}`);
  }
  if (args.layout && !fs.existsSync(args.layout)) {
    throw new Error(`--layout not found: ${args.layout}`);
  }
  if (args.captureConfig && !fs.existsSync(args.captureConfig)) {
    throw new Error(`--capture-config not found: ${args.captureConfig}`);
  }

  const fileConfig = loadCaptureConfigFile(args.captureConfig);
  const timing = resolveCaptureTiming(args, fileConfig);
  if (hasCaptureTour(timing) && args.driver === 'http') {
    throw new Error(
      'capture steps and --interaction require --driver detox; http has no true click path',
    );
  }

  const fixturePath = resolveFixturePath(args);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`);
  }
  const { takeDir, takeId } = resolveTakeDir(args);

  await waitForHealth();
  const needsAnimations = requiresAnimations(timing);
  if (needsAnimations) {
    disableReduceMotion(args.udid);
    if (readReduceMotion(args.udid)) {
      throw new Error('Reduce Motion is still enabled on the simulator');
    }
  }
  const rawPath = path.join(takeDir, 'raw.mp4');
  const takePath = path.join(takeDir, 'take.json');
  const composedPath = path.join(takeDir, 'demo.mp4');
  const posterPath = path.join(takeDir, 'demo.png');
  const logPath = path.join(takeDir, 'capture.log');
  const logs = [];
  const log = (message) => {
    const line = `[${new Date().toISOString()}] ${message}`;
    logs.push(line);
    console.log(line);
  };

  const fixtureRawBefore = fs.readFileSync(fixturePath);
  const fixtureHashBefore = sha256(fixtureRawBefore);
  const fixture = JSON.parse(fixtureRawBefore.toString('utf8'));

  log(
    `driver ${args.driver} interaction ${timing.interaction || 'none'} steps ${
      timing.steps ? timing.steps.length : 0
    } taps ${args.taps || 'none'} fixture ${fixturePath} takeDir ${takeDir} layout ${
      args.layout || 'none'
    } readyMarker ${timing.readyMarker} requiredMarkers ${JSON.stringify(
      timing.requiredMarkers,
    )} waitAfterReadyMs ${timing.waitAfterReadyMs} startMarker ${
      timing.startMarker || 'none'
    } endMarker ${timing.endMarker || 'none'} startOffsetSeconds ${
      timing.startOffsetSeconds
    } endCushionSeconds ${timing.endCushionSeconds}`,
  );

  let recording = null;
  let detoxSession = null;
  let complete = null;
  let riskAck = null;
  let interactionTap = null;
  let stepTaps = null;
  let tapAtMs = 0;
  try {
    await requestJson(`${FIXTURE_ORIGIN}/reset`, { method: 'POST' });

    if (args.driver === 'detox') {
      if (!fs.existsSync(args.appPath)) {
        throw new Error(`App not found: ${args.appPath}`);
      }
      log('detox internals init + launchApp (before recording)');
      detoxSession = await initDetox(args.udid, args.appPath);
      log('prime-demo-start exists; idle launcher ready');
    } else {
      log('waiting for launcherReady (http driver)');
      const ready = await waitForMarker('launcherReady', LAUNCHER_TIMEOUT_MS);
      if (needsAnimations && ready.marker?.extra?.reduceMotionEnabled) {
        throw new Error('App reported Reduce Motion enabled');
      }
      await requestJson(`${FIXTURE_ORIGIN}/command`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reset' }),
      });
      await sleep(400);
      await requestJson(`${FIXTURE_ORIGIN}/reset`, { method: 'POST' });
    }

    log('starting simctl recordVideo (waiting for Recording started)');
    recording = await startRecording(args.udid, rawPath);
    log(`Recording started at host ${recording.startedAtMs}`);
    tapAtMs = Date.now();

    if (args.driver === 'detox') {
      log('tap prime-demo-start');
      await detoxSession.element(detoxSession.by.id('prime-demo-start')).tap();
    } else {
      log('HTTP start command');
      await requestJson(`${FIXTURE_ORIGIN}/command`, {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      });
    }

    complete = await waitForReadyCapture(timing, 20_000);
    log(
      `ready ${timing.readyMarker} receivedAtMs=${complete.marker.receivedAtMs} sceneKey=${JSON.stringify(
        complete.sceneKey,
      )} requiredMarkers=${JSON.stringify(timing.requiredMarkers)}`,
    );

    if (timing.steps) {
      if (!detoxSession) {
        throw new Error('capture.steps requires an active Detox session');
      }
      log(
        `steps: waiting ${timing.waitAfterReadyMs}ms after ${timing.readyMarker} scene ${JSON.stringify(
          complete.sceneKey,
        )}`,
      );
      if (timing.waitAfterReadyMs) {
        await sleep(timing.waitAfterReadyMs);
      }
      const stepResult = await runCaptureSteps(timing.steps, {
        sceneKey: complete.sceneKey,
        driver: createDetoxStepDriver(detoxSession, log),
      });
      stepTaps = stepResult.taps;
      if (stepResult.riskAck) {
        riskAck = stepResult.riskAck;
      }
      if (stepResult.riskAckTap) {
        interactionTap = stepResult.riskAckTap;
      }
      if (timing.endMarker) {
        const endWait = await waitForMarker(timing.endMarker, 15_000, {
          sceneKey: complete.sceneKey,
        });
        if (timing.endMarker === 'riskAcknowledged') {
          riskAck = endWait;
        }
      }
      await sleep(timing.endCushionSeconds * 1000);
    } else if (timing.interaction === ACCEPTED_INTERACTION) {
      if (!detoxSession) {
        throw new Error(
          `--interaction ${ACCEPTED_INTERACTION} requires an active Detox session`,
        );
      }
      log(
        `interaction ${ACCEPTED_INTERACTION}: waiting ${timing.waitAfterReadyMs}ms after ${timing.readyMarker}`,
      );
      await sleep(timing.waitAfterReadyMs);
      interactionTap = await tapRiskCheckbox(detoxSession, log);
      log(
        `interaction ${ACCEPTED_INTERACTION}: waiting for riskAcknowledged scene ${JSON.stringify(
          complete.sceneKey,
        )} (native onChange, not host tap return)`,
      );
      riskAck = await waitForMarker('riskAcknowledged', 15_000, {
        sceneKey: complete.sceneKey,
      });
      log(
        `riskAcknowledged receivedAtMs=${riskAck.marker.receivedAtMs} checked=${JSON.stringify(
          riskAck.marker.extra?.checked,
        )} reactRootPoint=${JSON.stringify(
          riskAck.marker.extra?.reactRootPoint ?? null,
        )}`,
      );
      await sleep(timing.endCushionSeconds * 1000);
    } else {
      if (timing.waitAfterReadyMs) {
        await sleep(timing.waitAfterReadyMs);
      }
      if (timing.endMarker) {
        await waitForMarker(timing.endMarker, 15_000, {
          sceneKey: complete.sceneKey,
        });
      }
      await sleep(timing.endCushionSeconds * 1000);
    }
  } finally {
    await stopRecording(recording);
    if (detoxSession) {
      try {
        await detoxSession.detoxInternals.cleanup();
      } catch (error) {
        log(
          `detox cleanup failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    fs.writeFileSync(logPath, `${logs.join('\n')}\n`);
  }

  if (!complete || !recording) {
    throw new Error(
      `Capture ended before ready marker "${timing.readyMarker}"`,
    );
  }
  if (timing.interaction === ACCEPTED_INTERACTION && !riskAck) {
    throw new Error('Capture ended before riskAcknowledged');
  }
  if (timing.steps && (!stepTaps || stepTaps.length !== timing.steps.length)) {
    throw new Error('Capture ended before completing all capture.steps');
  }

  const latestMarkers = await requestJson(`${FIXTURE_ORIGIN}/markers`);
  let markers = applyHostDispatchTimes(
    latestMarkers.markers || complete.markers,
  );
  const overlayTap =
    timing.interaction === ACCEPTED_INTERACTION
      ? interactionTap
      : stepTaps?.find((tap) => tap.testID === RISK_CHECKBOX_TEST_ID) ||
        interactionTap;
  const shouldOverlayRiskAck =
    timing.interaction === ACCEPTED_INTERACTION ||
    Boolean(
      timing.steps &&
      overlayTap &&
      selectSceneMarker(markers, 'riskAcknowledged', complete.sceneKey),
    );
  if (shouldOverlayRiskAck) {
    if (!overlayTap?.screenPoint) {
      throw new Error(
        'risk-checkbox interaction missing Detox screenPoint; cannot overlay extra.point',
      );
    }
    const sceneKey =
      riskAck?.marker?.sceneKey ??
      complete.sceneKey ??
      complete.marker.sceneKey ??
      null;
    markers = applyScreenPointToRiskAckMarkers(
      markers,
      { screenPoint: overlayTap.screenPoint },
      sceneKey,
    );
    const overlaid = markers.find(
      (marker) =>
        marker.name === 'riskAcknowledged' &&
        (!sceneKey || marker.sceneKey === sceneKey),
    );
    log(
      `riskAcknowledged extra.point=${JSON.stringify(
        overlaid?.extra?.point ?? null,
      )} reactRootPoint=${JSON.stringify(
        overlaid?.extra?.reactRootPoint ?? null,
      )} pointSource=${overlaid?.extra?.pointSource ?? null}`,
    );
  }
  const fixtureRawAfter = fs.readFileSync(fixturePath);
  const fixtureHashAfter = sha256(fixtureRawAfter);
  const rawHash = fs.existsSync(rawPath)
    ? sha256(fs.readFileSync(rawPath))
    : null;
  const sheetMarker = pickSheetOpenMarker(markers, complete.sceneKey);
  let startEventMarker = sheetMarker;
  if (timing.startMarker) {
    startEventMarker = selectSceneMarker(
      markers,
      timing.startMarker,
      complete.sceneKey,
    );
    if (!startEventMarker) {
      throw new Error(
        `Missing start marker "${timing.startMarker}" scene ${JSON.stringify(
          complete.sceneKey,
        )}`,
      );
    }
  }
  const startSeconds = startEventMarker
    ? secondsFromRecording(
        recording.startedAtMs,
        startEventMarker.receivedAtMs,
        timing.startOffsetSeconds,
      )
    : 0;
  const endCushionSec = timing.endCushionSeconds;
  const endOffsetSec = resolveRequestedEndOffsetSeconds(timing);
  let endEventMarker = complete.marker;
  if (timing.endMarker) {
    endEventMarker = selectSceneMarker(
      markers,
      timing.endMarker,
      complete.sceneKey,
    );
    if (!endEventMarker) {
      throw new Error(
        `Missing end marker "${timing.endMarker}" scene ${JSON.stringify(
          complete.sceneKey,
        )}`,
      );
    }
  } else if (timing.interaction === ACCEPTED_INTERACTION && riskAck) {
    endEventMarker = riskAck.marker;
  } else if (timing.steps && stepTaps?.length) {
    endEventMarker =
      selectSceneMarker(
        markers,
        stepTaps[stepTaps.length - 1].id,
        complete.sceneKey,
      ) || complete.marker;
  }
  const requestedEndSeconds = secondsFromRecording(
    recording.startedAtMs,
    endEventMarker.receivedAtMs,
    endOffsetSec,
  );
  const probe = probeRawVideo(rawPath);
  const actualEndSeconds =
    probe.lastFramePtsSeconds === null
      ? requestedEndSeconds
      : Math.min(requestedEndSeconds, probe.lastFramePtsSeconds);
  const take = {
    takeId,
    driver: args.driver,
    udid: args.udid,
    appPath: args.appPath,
    bundleId: args.bundleId,
    rawPath,
    rawHash,
    fixture,
    fixtureHash: fixtureHashBefore,
    source: {
      fixturePath: path.relative(repoRoot, fixturePath),
      fixtureHashBefore,
      fixtureHashAfter,
      fixtureUnchanged: fixtureHashBefore === fixtureHashAfter,
      rawHash,
    },
    host: {
      recordingStartedMs: recording.startedAtMs,
      tapOrStartMs: tapAtMs,
      sheetOpenReceivedMs: sheetMarker?.receivedAtMs ?? null,
      sheetOpenMarker: sheetMarker?.name ?? null,
      readyMarker: timing.readyMarker,
      readyReceivedMs: complete.marker.receivedAtMs,
      requiredMarkers: timing.requiredMarkers,
      waitAfterReadyMs: timing.waitAfterReadyMs,
      animationsCompleteReceivedMs:
        selectSceneMarker(markers, 'animationsComplete', complete.sceneKey)
          ?.receivedAtMs ??
        (timing.readyMarker === 'animationsComplete'
          ? complete.marker.receivedAtMs
          : null),
      riskAcknowledgedReceivedMs: riskAck?.marker?.receivedAtMs ?? null,
      interaction: timing.interaction,
      interactionTap,
      startMarker: timing.startMarker,
      startMarkerReceivedMs: timing.startMarker
        ? (startEventMarker?.receivedAtMs ?? null)
        : null,
      endMarker: timing.endMarker,
      endMarkerReceivedMs: timing.endMarker
        ? (endEventMarker?.receivedAtMs ?? null)
        : null,
      steps: timing.steps,
      stepTaps,
      leadInSec: timing.leadInSec,
      startOffsetSeconds: timing.startOffsetSeconds,
      waitAfterAnimationsMs: timing.waitAfterReadyMs,
      endCushionSec,
      endOffsetSec,
    },
    video: {
      startSeconds,
      requestedEndSeconds,
      actualEndSeconds,
      holdSeconds: args.hold,
      lastFramePtsSeconds: probe.lastFramePtsSeconds,
      formatDurationSeconds: probe.formatDurationSeconds,
      packetCount: probe.packetCount,
      ffprobeStderr: probe.stderr || undefined,
    },
    markers,
    matchedSceneKey:
      complete.sceneKey ??
      complete.marker.sceneKey ??
      sheetMarker?.sceneKey ??
      null,
    timingNotes: TIMING_NOTES,
    simctl: {
      stdout: recording.stdoutText,
      stderr: recording.stderrText,
    },
  };
  fs.writeFileSync(takePath, `${JSON.stringify(take, null, 2)}\n`);
  log(`wrote ${takePath}`);

  if (args.compose) {
    const composePath = path.join(
      repoRoot,
      'development/prime-demo/compose.mjs',
    );
    log(
      `compose --start ${startSeconds.toFixed(
        3,
      )} --end ${actualEndSeconds.toFixed(3)} --hold ${args.hold}${
        args.camera ? ` --camera ${args.camera}` : ''
      }${args.taps ? ` --taps ${args.taps}` : ''} --take ${takePath}${
        args.layout ? ` --layout ${args.layout}` : ''
      }`,
    );
    const composeArgs = [
      composePath,
      '--input',
      rawPath,
      '--output',
      composedPath,
      '--start',
      String(startSeconds),
      '--end',
      String(actualEndSeconds),
      '--hold',
      String(args.hold),
      '--poster',
      posterPath,
    ];
    if (args.camera) {
      composeArgs.push('--camera', args.camera);
    }
    if (args.taps) {
      composeArgs.push('--taps', args.taps);
    }
    composeArgs.push('--take', takePath);
    if (args.layout) {
      composeArgs.push('--layout', args.layout);
    }
    run(process.execPath, composeArgs);
    log(`composed ${composedPath}`);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
