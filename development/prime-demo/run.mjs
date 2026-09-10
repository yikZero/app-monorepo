#!/usr/bin/env node
/* cspell:ignore bootstatus */
/**
 * Local one-command Prime demo capture wrapper.
 * Boots the dedicated simulator, starts fixture :4737 + Metro :8081 if we own
 * them, runs capture.js --driver detox, then stops only processes we spawned.
 *
 * Does not build .app, does not kill unknown port occupants, does not shut
 * down the simulator.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_APP_PATH,
  LEGACY_UDID,
  resolveRecordTargets,
} from './environment.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');

export const DEFAULT_UDID = LEGACY_UDID;
export { DEFAULT_APP_PATH };
export const METRO_PORT = 8081;
export const FIXTURE_PORT = 4737;
export const METRO_HEALTH_TIMEOUT_MS = 180_000;
export const FIXTURE_HEALTH_TIMEOUT_MS = 20_000;

export const DEBUG_SIMULATOR_BUILD_COMMAND =
  'yarn workspace @onekeyhq/mobile detox:build:ios:sim:debug';

export const DEBUG_SIMULATOR_XCODEBUILD =
  "xcodebuild -workspace ios/OneKeyWallet.xcworkspace -scheme OneKeyWallet -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build/detox";

class UsageError extends Error {}

function printUsage() {
  console.log(`One-command local Prime demo capture.

Usage:
  node development/prime-demo/run.mjs [options]

Options:
  --udid <id>           Simulator UDID (else PRIME_DEMO_UDID or demo.mjs setup)
  --app-path <path>     Signed Debug .app (else PRIME_DEMO_APP_PATH, saved, or .tmp package)
  --hold <seconds>      compose hold passed to capture.js (default 2)
  --camera <json>       Pan keyframes or event-relative moves JSON (optional)
  --taps <json>         Tap-guide JSON, forwarded to capture/compose with --take
  --interaction <name>  Optional capture action; only accepted value: risk-checkbox
  --fixture <json>      Fixture JSON shared by fixture-server and capture
  --take-dir <dir>      Capture output directory (must not already contain raw.mp4)
  --layout <json>       Forwarded to capture/compose --layout
  --capture-config <json>  Capture timing/interaction/steps JSON
  --repeat <n>          Run capture.js sequentially n times (default 1)
  --reuse-services      If :8081 / :4737 already serve Metro / fixture, reuse them
  --help                Show this help

--interaction default is none (omit the flag). Independent of --taps enabled:
hiding the guide still records the real checkbox click when risk-checkbox is set.
capture.steps in --capture-config is mutually exclusive with --interaction.
Confirm is never pressed.

Starts fixture :${FIXTURE_PORT} and Metro :${METRO_PORT} unless --reuse-services.
Stops only process groups this wrapper spawned. Never kills unknown port occupants
or shuts down the simulator.
`);
}

export function parseArgs(argv) {
  const options = {
    help: false,
    udid: null,
    appPath: null,
    hold: 2,
    camera: null,
    taps: null,
    interaction: null,
    fixture: null,
    takeDir: null,
    layout: null,
    captureConfig: null,
    repeat: 1,
    reuseServices: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--reuse-services') {
      options.reuseServices = true;
    } else {
      const eq = arg.match(/^--([a-z0-9-]+)=(.*)$/s);
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
    case 'udid':
      options.udid = value;
      break;
    case 'app-path':
      options.appPath = value;
      break;
    case 'hold':
      options.hold = parseNumber('hold', value);
      break;
    case 'camera':
      options.camera = value;
      break;
    case 'taps':
      options.taps = value;
      break;
    case 'interaction':
      options.interaction = value;
      break;
    case 'fixture':
      options.fixture = value;
      break;
    case 'take-dir':
      options.takeDir = value;
      break;
    case 'layout':
      options.layout = value;
      break;
    case 'capture-config':
      options.captureConfig = value;
      break;
    case 'repeat':
      options.repeat = parseInteger('repeat', value);
      break;
    default:
      throw new UsageError(`Unknown option --${key}`);
  }
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

function parseInteger(name, raw) {
  const n = parseNumber(name, raw);
  if (!Number.isInteger(n)) {
    throw new UsageError(`--${name} must be an integer, got ${raw}`);
  }
  return n;
}

function validateOptions(options) {
  if (options.hold < 0) {
    throw new UsageError(`--hold must be >= 0, got ${options.hold}`);
  }
  if (options.repeat < 1) {
    throw new UsageError(`--repeat must be >= 1, got ${options.repeat}`);
  }
  if (options.interaction && options.interaction !== 'risk-checkbox') {
    throw new UsageError(
      `--interaction must be risk-checkbox (omit for none), got ${JSON.stringify(
        options.interaction,
      )}`,
    );
  }
}

export function missingAppMessage(appPath) {
  return `Signed Debug simulator app not found:
  ${appPath}

Prepare the dedicated simulator, then build the signed demo app (from the repo root):

  node development/prime-demo/demo.mjs setup
  node development/prime-demo/demo.mjs build-ios --install-pods

The build writes the signed Debug .app to:
  ${DEFAULT_APP_PATH}

This wrapper will not build, and will not copy a random cached .app.`;
}

function occupiedPortMessage(port) {
  return `Port ${port} is already in use on 127.0.0.1.
This wrapper will not kill unknown processes.
If that listener is the Prime demo Metro (8081) or fixture server (4737) you already started, re-run with --reuse-services.`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isListening(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(400, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

function httpGet(url, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
  });
}

async function waitForOk(label, probe, timeoutMs, log) {
  const started = Date.now();
  const deadline = started + timeoutMs;
  let lastError = '';
  let lastNotice = 0;
  while (Date.now() < deadline) {
    try {
      if (await probe()) {
        log(`${label} ready after ${Date.now() - started}ms`);
        return;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (Date.now() - lastNotice >= 10_000) {
      lastNotice = Date.now();
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      log(`waiting for ${label} (${left}s left)`);
    }
    await sleep(400);
  }
  throw new Error(
    `${label} not ready within ${timeoutMs}ms${lastError ? `: ${lastError}` : ''}`,
  );
}

async function metroHealthy() {
  const { status, body } = await httpGet(
    `http://127.0.0.1:${METRO_PORT}/status`,
  );
  return status === 200 && typeof body === 'string' && body.includes('running');
}

async function fixtureHealthy() {
  const { status, body } = await httpGet(
    `http://127.0.0.1:${FIXTURE_PORT}/health`,
  );
  if (status !== 200) return false;
  try {
    return JSON.parse(body).ok === true;
  } catch {
    return false;
  }
}

function spawnArgv(bin, args, { cwd, env, detached = false, logStream } = {}) {
  const child = spawn(bin, args, {
    cwd,
    env,
    shell: false,
    detached,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (logStream) {
    child.stdout.on('data', (chunk) => {
      logStream.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      logStream.write(chunk);
    });
  }
  return child;
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    let settled = false;
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      resolve({ code, signal });
    });
  });
}

async function runArgv(
  bin,
  args,
  { cwd, env, logStream, allowCodes = [0] } = {},
) {
  const child = spawnArgv(bin, args, { cwd, env, logStream });
  const stdoutChunks = [];
  const stderrChunks = [];
  child.stdout.on('data', (chunk) => {
    stdoutChunks.push(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderrChunks.push(chunk);
  });
  const { code, signal } = await waitForExit(child);
  const stdout = Buffer.concat(stdoutChunks).toString('utf8');
  const stderr = Buffer.concat(stderrChunks).toString('utf8');
  if (allowCodes !== 'any' && !allowCodes.includes(code)) {
    const combined = `${stderr}\n${stdout}`.trim();
    throw new Error(
      `${bin} ${args.join(' ')} failed (code=${code} signal=${signal})\n${combined}`,
    );
  }
  return { code, signal, stdout, stderr };
}

function stopProcessGroup(child, log, label) {
  if (!child?.pid) return;
  const pid = child.pid;
  try {
    process.kill(-pid, 'SIGTERM');
    log(`SIGTERM process group ${pid} (${label})`);
  } catch (error) {
    if (error && error.code !== 'ESRCH') {
      log(`SIGTERM ${label} pid ${pid}: ${error.message}`);
    }
  }
}

function killProcessGroup(child, log, label) {
  if (!child?.pid) return;
  const pid = child.pid;
  try {
    process.kill(-pid, 'SIGKILL');
    log(`SIGKILL process group ${pid} (${label})`);
  } catch (error) {
    if (error && error.code !== 'ESRCH') {
      log(`SIGKILL ${label} pid ${pid}: ${error.message}`);
    }
  }
}

async function bootSimulator(udid, log, logStream) {
  log(`simctl boot ${udid}`);
  const booted = await runArgv('xcrun', ['simctl', 'boot', udid], {
    logStream,
    allowCodes: 'any',
  });
  const text = `${booted.stderr}\n${booted.stdout}`;
  if (booted.code !== 0 && !/current state: Booted/i.test(text)) {
    throw new Error(
      `Failed to boot simulator ${udid} (code=${booted.code})\n${text.trim()}`,
    );
  }
  log('simctl bootstatus -b');
  const status = await runArgv('xcrun', ['simctl', 'bootstatus', udid, '-b'], {
    logStream,
  });
  if (status.code !== 0) {
    throw new Error(`simctl bootstatus failed for ${udid}\n${status.stderr}`);
  }
}

async function installApp(udid, appPath, log, logStream) {
  log(`simctl install ${udid} ${appPath}`);
  const result = await runArgv('xcrun', ['simctl', 'install', udid, appPath], {
    logStream,
  });
  if (result.code !== 0) {
    throw new Error(`simctl install failed\n${result.stderr || result.stdout}`);
  }
}

function createLogger(runLogPath) {
  fs.mkdirSync(path.dirname(runLogPath), { recursive: true });
  const stream = fs.createWriteStream(runLogPath, { flags: 'w' });
  const log = (message) => {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    stream.write(line);
    process.stdout.write(line);
  };
  return { stream, log };
}

async function run(options) {
  validateOptions(options);
  let resolved;
  try {
    resolved = resolveRecordTargets({
      udid: options.udid,
      appPath: options.appPath,
    });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : error);
  }
  const appPath = path.resolve(resolved.appPath);
  const udid = resolved.udid;
  const hold = options.hold;
  const cameraPath = options.camera ? path.resolve(options.camera) : null;
  const tapsPath = options.taps ? path.resolve(options.taps) : null;
  let fixturePath;
  if (options.fixture) {
    fixturePath = path.resolve(options.fixture);
  } else if (process.env.PRIME_DEMO_FIXTURE_PATH) {
    fixturePath = path.resolve(process.env.PRIME_DEMO_FIXTURE_PATH);
  } else {
    fixturePath = path.join(SCRIPT_DIR, 'fixtures/permit2-uniswap.json');
  }
  const takeDir = options.takeDir ? path.resolve(options.takeDir) : null;
  const layoutPath = options.layout ? path.resolve(options.layout) : null;
  const captureConfigPath = options.captureConfig
    ? path.resolve(options.captureConfig)
    : null;
  const interaction = options.interaction;
  const repeat = options.repeat;

  if (!fs.existsSync(appPath)) {
    throw new UsageError(missingAppMessage(appPath));
  }
  if (cameraPath && !fs.existsSync(cameraPath)) {
    throw new UsageError(`--camera not found: ${cameraPath}`);
  }
  if (tapsPath && !fs.existsSync(tapsPath)) {
    throw new UsageError(`--taps not found: ${tapsPath}`);
  }
  if (!fs.existsSync(fixturePath)) {
    throw new UsageError(`--fixture not found: ${fixturePath}`);
  }
  if (layoutPath && !fs.existsSync(layoutPath)) {
    throw new UsageError(`--layout not found: ${layoutPath}`);
  }
  if (captureConfigPath && !fs.existsSync(captureConfigPath)) {
    throw new UsageError(`--capture-config not found: ${captureConfigPath}`);
  }
  if (takeDir) {
    const existingRaw = path.join(takeDir, 'raw.mp4');
    if (fs.existsSync(existingRaw)) {
      throw new UsageError(`--take-dir already has raw.mp4: ${existingRaw}`);
    }
  }
  if (takeDir && repeat > 1) {
    throw new UsageError('--take-dir cannot be used with --repeat > 1');
  }

  const metroBusy = await isListening(METRO_PORT);
  const fixtureBusy = await isListening(FIXTURE_PORT);

  if (!options.reuseServices && (metroBusy || fixtureBusy)) {
    const port = metroBusy ? METRO_PORT : FIXTURE_PORT;
    throw new UsageError(occupiedPortMessage(port));
  }

  if (
    options.reuseServices &&
    metroBusy &&
    !(await metroHealthy().catch(() => false))
  ) {
    throw new UsageError(
      `Port ${METRO_PORT} is occupied but Metro /status is not healthy. Will not kill the occupant; start the Prime demo Metro or free the port.`,
    );
  }
  if (
    options.reuseServices &&
    fixtureBusy &&
    !(await fixtureHealthy().catch(() => false))
  ) {
    throw new UsageError(
      `Port ${FIXTURE_PORT} is occupied but fixture /health is not ok. Will not kill the occupant; start the Prime demo fixture server or free the port.`,
    );
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const startupDir = path.join(SCRIPT_DIR, 'output', '.startup', runId);
  fs.mkdirSync(startupDir, { recursive: true });
  const { stream: runLog, log } = createLogger(
    path.join(startupDir, 'run.log'),
  );
  const metroLog = fs.createWriteStream(path.join(startupDir, 'metro.log'));
  const fixtureLog = fs.createWriteStream(path.join(startupDir, 'fixture.log'));

  const owned = {
    metro: null,
    fixture: null,
    capture: null,
  };
  let cleaned = false;

  const cleanupOwned = async () => {
    if (cleaned) return;
    cleaned = true;
    log('cleaning up process groups spawned by this wrapper');
    stopProcessGroup(owned.capture, log, 'capture');
    stopProcessGroup(owned.metro, log, 'metro');
    stopProcessGroup(owned.fixture, log, 'fixture');
    await sleep(1500);
    killProcessGroup(owned.capture, log, 'capture');
    killProcessGroup(owned.metro, log, 'metro');
    killProcessGroup(owned.fixture, log, 'fixture');
    owned.capture = null;
    owned.metro = null;
    owned.fixture = null;
  };

  const onSignal = (signal) => {
    log(`received ${signal}`);
    void cleanupOwned().finally(() => {
      runLog.end();
      metroLog.end();
      fixtureLog.end();
      process.exit(signal === 'SIGINT' ? 130 : 1);
    });
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  try {
    log(`repo ${REPO_ROOT}`);
    log(`udid ${udid}`);
    log(`app ${appPath}`);
    log(
      `hold ${hold} camera ${cameraPath || 'none'} taps ${tapsPath || 'none'} interaction ${interaction || 'none'} fixture ${fixturePath} takeDir ${takeDir || 'auto'} layout ${layoutPath || 'none'} captureConfig ${captureConfigPath || 'none'} repeat ${repeat} reuseServices ${options.reuseServices}`,
    );
    log(`startup logs ${startupDir}`);

    await bootSimulator(udid, log, runLog);
    await installApp(udid, appPath, log, runLog);

    const childEnv = {
      ...process.env,
      PRIME_DEMO_ENABLED: 'true',
      ENABLE_NATIVE_BACKGROUND_THREAD: 'false',
      SIMCTL_CHILD_ENABLE_NATIVE_BACKGROUND_THREAD: 'false',
      PRIME_DEMO_UDID: udid,
      PRIME_DEMO_APP_PATH: appPath,
      PRIME_DEMO_FIXTURE_PORT: String(FIXTURE_PORT),
      PRIME_DEMO_FIXTURE_PATH: fixturePath,
    };

    if (!fixtureBusy) {
      log(`starting fixture server :${FIXTURE_PORT}`);
      owned.fixture = spawnArgv(
        process.execPath,
        [path.join(SCRIPT_DIR, 'scripts/fixture-server.js')],
        {
          cwd: SCRIPT_DIR,
          env: childEnv,
          detached: true,
          logStream: fixtureLog,
        },
      );
      log(`fixture pid ${owned.fixture.pid}`);
    } else {
      log(`reusing fixture on :${FIXTURE_PORT}`);
    }

    if (!metroBusy) {
      log(
        `starting Metro :${METRO_PORT} via yarn workspace @onekeyhq/mobile prime-demo --port ${METRO_PORT}`,
      );
      owned.metro = spawnArgv(
        'yarn',
        [
          'workspace',
          '@onekeyhq/mobile',
          'prime-demo',
          '--port',
          String(METRO_PORT),
        ],
        {
          cwd: REPO_ROOT,
          env: {
            ...childEnv,
            NODE_OPTIONS:
              process.env.NODE_OPTIONS || '--max_old_space_size=8192',
          },
          detached: true,
          logStream: metroLog,
        },
      );
      log(`metro pid ${owned.metro.pid}`);
    } else {
      log(`reusing Metro on :${METRO_PORT}`);
    }

    await waitForOk(
      'fixture /health',
      fixtureHealthy,
      FIXTURE_HEALTH_TIMEOUT_MS,
      log,
    );
    await waitForOk(
      `Metro :${METRO_PORT}/status`,
      metroHealthy,
      METRO_HEALTH_TIMEOUT_MS,
      log,
    );

    const capturePath = path.join(SCRIPT_DIR, 'scripts/capture.js');
    for (let i = 0; i < repeat; i += 1) {
      log(
        `capture ${i + 1}/${repeat} --driver detox --hold ${hold}${cameraPath ? ` --camera ${cameraPath}` : ''}${tapsPath ? ` --taps ${tapsPath}` : ''}${interaction ? ` --interaction ${interaction}` : ''}${takeDir ? ` --take-dir ${takeDir}` : ''}${layoutPath ? ` --layout ${layoutPath}` : ''}${captureConfigPath ? ` --capture-config ${captureConfigPath}` : ''} --fixture ${fixturePath}`,
      );
      const captureLog = fs.createWriteStream(
        path.join(startupDir, `capture-${i + 1}.log`),
      );
      const captureArgs = [
        capturePath,
        '--driver',
        'detox',
        '--app-path',
        appPath,
        '--udid',
        udid,
        '--hold',
        String(hold),
      ];
      if (cameraPath) {
        captureArgs.push('--camera', cameraPath);
      }
      if (tapsPath) {
        captureArgs.push('--taps', tapsPath);
      }
      if (interaction) {
        captureArgs.push('--interaction', interaction);
      }
      captureArgs.push('--fixture', fixturePath);
      if (takeDir) {
        captureArgs.push('--take-dir', takeDir);
      }
      if (layoutPath) {
        captureArgs.push('--layout', layoutPath);
      }
      if (captureConfigPath) {
        captureArgs.push('--capture-config', captureConfigPath);
      }
      const capture = spawnArgv(process.execPath, captureArgs, {
        cwd: REPO_ROOT,
        env: childEnv,
        detached: true,
        logStream: captureLog,
      });
      owned.capture = capture;
      capture.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
      });
      capture.stderr.on('data', (chunk) => {
        process.stderr.write(chunk);
      });
      const result = await waitForExit(capture);
      owned.capture = null;
      captureLog.end();
      if (result.code !== 0) {
        throw new Error(
          `capture.js exited ${result.code}${result.signal ? ` signal=${result.signal}` : ''} (take ${i + 1}/${repeat})`,
        );
      }
      log(`capture ${i + 1}/${repeat} ok`);
    }
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    await cleanupOwned();
    runLog.end();
    metroLog.end();
    fixtureLog.end();
  }
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
    await run(options);
  } catch (error) {
    if (error instanceof UsageError) {
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
