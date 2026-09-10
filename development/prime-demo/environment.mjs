/**
 * Local environment config, doctor, and simulator setup for Prime demo.
 * Not claimed as fully cross-platform tested.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PRIME_DEMO_ROOT = SCRIPT_DIR;
export const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
export const ENVIRONMENT_PATH = path.join(
  PRIME_DEMO_ROOT,
  'output',
  '.environment.json',
);
export const DEVICE_NAME = 'OneKey Prime Demo 393x852';
export const DEVICE_TYPE_ID =
  'com.apple.CoreSimulator.SimDeviceType.iPhone-15-Pro';
export const DEVICE_TYPE_NAME = 'iPhone 15 Pro';
export const PREFERRED_RUNTIME_ID =
  'com.apple.CoreSimulator.SimRuntime.iOS-26-5';
export const DEFAULT_APP_PATH = path.join(
  REPO_ROOT,
  '.tmp/prime-demo/native/OneKeyWallet.app',
);
export const METRO_PORT = 8081;
export const FIXTURE_PORT = 4737;
export const LEGACY_UDID = '231FF367-DF91-4F64-AEB0-A56ABE437CBE';

const FFMPEG_DEFAULT = '/opt/homebrew/bin/ffmpeg';
const FFPROBE_DEFAULT = '/opt/homebrew/bin/ffprobe';
const REQUIRED_FILTERS = [
  'setparams',
  'geq',
  'fps',
  'setpts',
  'tpad',
  'overlay',
  'scale',
  'crop',
  'alphamerge',
];
const MIN_NODE = '22.12.0';
const NITRO_PACKAGE = 'react-native-nitro-modules';

function resolveBin(envName, preferred, fallback) {
  if (process.env[envName]) return process.env[envName];
  return fs.existsSync(preferred) ? preferred : fallback;
}

export function ffmpegBin() {
  return resolveBin('FFMPEG', FFMPEG_DEFAULT, 'ffmpeg');
}

export function ffprobeBin() {
  return resolveBin('FFPROBE', FFPROBE_DEFAULT, 'ffprobe');
}

function runCapture(bin, args) {
  return spawnSync(bin, args, { encoding: 'utf8' });
}

export function loadSavedEnvironment(filePath = ENVIRONMENT_PATH) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSavedEnvironment(config, filePath = ENVIRONMENT_PATH) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`);
  return filePath;
}

export function parseSimctlDeviceList(json) {
  const devices = [];
  const map = json && typeof json === 'object' ? json.devices || {} : {};
  for (const [runtimeId, list] of Object.entries(map)) {
    if (Array.isArray(list)) {
      for (const device of list) {
        devices.push({
          udid: device.udid,
          name: device.name,
          runtimeId,
          isAvailable: Boolean(device.isAvailable),
          state: device.state || null,
          deviceTypeId: device.deviceTypeIdentifier || null,
        });
      }
    }
  }
  return devices;
}

export function parseSimctlRuntimeList(json) {
  const runtimes = json && Array.isArray(json.runtimes) ? json.runtimes : [];
  return runtimes.map((runtime) => ({
    identifier: runtime.identifier,
    name: runtime.name,
    isAvailable: Boolean(runtime.isAvailable),
  }));
}

export function findDedicatedDevice(
  devices,
  { name = DEVICE_NAME, runtimeId = null, deviceTypeId = DEVICE_TYPE_ID } = {},
) {
  const list = Array.isArray(devices) ? devices : [];
  const matches = list.filter(
    (device) =>
      device.name === name &&
      device.isAvailable &&
      device.deviceTypeId === deviceTypeId,
  );
  if (runtimeId) {
    return matches.find((device) => device.runtimeId === runtimeId) || null;
  }
  return matches[0] || null;
}

export function nodeVersionAtLeast(version, min = MIN_NODE) {
  const parts = (value) =>
    String(value)
      .replace(/^v/i, '')
      .split('.')
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0);
  const [major, minor, patch] = parts(version);
  const [minMajor, minMinor, minPatch] = parts(min);
  if (major !== minMajor) return major > minMajor;
  if (minor !== minMinor) return minor > minMinor;
  return patch >= minPatch;
}

export function resolveAppPath({
  appPath = null,
  env = process.env,
  saved = loadSavedEnvironment(),
} = {}) {
  if (appPath) return path.resolve(appPath);
  if (env.PRIME_DEMO_APP_PATH) return path.resolve(env.PRIME_DEMO_APP_PATH);
  if (saved && typeof saved.appPath === 'string' && saved.appPath) {
    return path.resolve(saved.appPath);
  }
  return DEFAULT_APP_PATH;
}

export function resolveUdid({
  udid = null,
  env = process.env,
  saved = loadSavedEnvironment(),
  devices = null,
} = {}) {
  if (udid) return { udid, source: 'flag' };
  if (env.PRIME_DEMO_UDID) return { udid: env.PRIME_DEMO_UDID, source: 'env' };
  if (saved && typeof saved.udid === 'string' && saved.udid) {
    return { udid: saved.udid, source: 'saved' };
  }
  const dedicated = findDedicatedDevice(devices || listSimulatorDevicesSafe());
  if (dedicated) return { udid: dedicated.udid, source: 'dedicated' };
  const error = new Error(
    'No simulator UDID. Pass --udid, set PRIME_DEMO_UDID, or run: node development/prime-demo/demo.mjs setup',
  );
  error.code = 'PRIME_DEMO_UDID';
  throw error;
}

export function resolveRecordTargets(options = {}) {
  const saved =
    options.saved !== undefined ? options.saved : loadSavedEnvironment();
  return {
    udid: resolveUdid({ ...options, saved }).udid,
    appPath: resolveAppPath({ ...options, saved }),
    saved,
  };
}

function listSimulatorDevicesSafe() {
  const result = runCapture('xcrun', ['simctl', 'list', 'devices', '-j']);
  if (result.status !== 0) return [];
  try {
    return parseSimctlDeviceList(JSON.parse(result.stdout || '{}'));
  } catch {
    return [];
  }
}

function listSimulatorRuntimesSafe() {
  const result = runCapture('xcrun', ['simctl', 'list', 'runtimes', '-j']);
  if (result.status !== 0) return [];
  try {
    return parseSimctlRuntimeList(JSON.parse(result.stdout || '{}'));
  } catch {
    return [];
  }
}

function which(bin) {
  const result = runCapture(bin, ['-version']);
  if (result.status === 0) {
    return (result.stdout || result.stderr || '').split('\n')[0] || bin;
  }
  const probe = runCapture(bin, ['--version']);
  if (probe.status === 0) {
    return (probe.stdout || probe.stderr || '').split('\n')[0] || bin;
  }
  return null;
}

function ffmpegHasEncoder(name) {
  const result = runCapture(ffmpegBin(), ['-hide_banner', '-encoders']);
  if (result.status !== 0) return false;
  return new RegExp(`\\b${name}\\b`).test(result.stdout || '');
}

function ffmpegHasFilter(name) {
  const result = runCapture(ffmpegBin(), ['-hide_banner', '-filters']);
  if (result.status !== 0) return false;
  return new RegExp(`\\b${name}\\b`).test(result.stdout || '');
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(400);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

function appArchitectures(appPath) {
  const binary = path.join(appPath, 'OneKeyWallet');
  if (!fs.existsSync(binary)) return [];
  const architectureProbe = runCapture('lipo', ['-archs', binary]);
  if (architectureProbe.status === 0 && architectureProbe.stdout.trim()) {
    return architectureProbe.stdout.trim().split(/\s+/);
  }
  const file = runCapture('file', [binary]);
  const text = `${file.stdout || ''} ${file.stderr || ''}`;
  const found = [];
  if (/\barm64\b/.test(text)) found.push('arm64');
  if (/\bx86_64\b/.test(text)) found.push('x86_64');
  return found;
}

function addCheck(checks, ok, label, detail) {
  checks.push({ ok, label, detail: detail || (ok ? 'ok' : 'missing') });
}

function hostNativeArch() {
  if (os.arch() === 'arm64') return 'arm64';
  if (os.arch() === 'x64') return 'x86_64';
  return os.arch();
}

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function packageVersion(dir) {
  const pkg = readJsonIfExists(path.join(dir, 'package.json'));
  return pkg && typeof pkg.version === 'string' ? pkg.version : null;
}

function declaredDependency(name) {
  const pkg = readJsonIfExists(path.join(REPO_ROOT, 'package.json'));
  const mobile = readJsonIfExists(
    path.join(REPO_ROOT, 'apps/mobile/package.json'),
  );
  if (!pkg || typeof pkg !== 'object') return null;
  return (
    pkg.resolutions?.[name] ||
    pkg.dependencies?.[name] ||
    pkg.devDependencies?.[name] ||
    mobile?.dependencies?.[name] ||
    mobile?.devDependencies?.[name] ||
    null
  );
}

function stripVersionRange(spec) {
  return String(spec || '').replace(/^[\^~]/, '');
}

export function inspectPostTools() {
  const checks = [];
  addCheck(
    checks,
    nodeVersionAtLeast(process.versions.node),
    'node',
    `node ${process.version} (need >=${MIN_NODE})`,
  );
  const ffmpegVersion = which(ffmpegBin());
  addCheck(
    checks,
    Boolean(ffmpegVersion),
    'ffmpeg',
    ffmpegVersion || 'not found',
  );
  const ffprobeVersion = which(ffprobeBin());
  addCheck(
    checks,
    Boolean(ffprobeVersion),
    'ffprobe',
    ffprobeVersion || 'not found',
  );
  addCheck(checks, ffmpegHasEncoder('libx264'), 'encoder libx264');
  for (const filter of REQUIRED_FILTERS) {
    addCheck(checks, ffmpegHasFilter(filter), `filter ${filter}`);
  }
  const sh = runCapture('sh', ['-c', 'echo ok']);
  addCheck(checks, sh.status === 0 && sh.stdout.trim() === 'ok', 'sh');
  const encoderSh = path.join(SCRIPT_DIR, 'export-upload.sh');
  addCheck(checks, fs.existsSync(encoderSh), 'export-upload.sh', encoderSh);
  return checks;
}

export function inspectRecordEnvironment({
  udid = null,
  appPath = null,
  env = process.env,
  saved = loadSavedEnvironment(),
  devices = null,
  runtimes = null,
} = {}) {
  const checks = inspectPostTools();
  addCheck(
    checks,
    process.platform === 'darwin',
    'macos',
    `${process.platform} ${os.arch()}`,
  );
  const xcode = runCapture('xcodebuild', ['-version']);
  addCheck(
    checks,
    xcode.status === 0,
    'xcode',
    xcode.status === 0
      ? (xcode.stdout || '').split('\n')[0]
      : 'xcodebuild not found',
  );
  const simctl = runCapture('xcrun', ['simctl', 'help']);
  addCheck(checks, simctl.status === 0, 'simctl');
  const simulatorUtilsCheck = runCapture('applesimutils', ['--help']);
  addCheck(
    checks,
    simulatorUtilsCheck.status === 0,
    'applesimutils',
    simulatorUtilsCheck.status === 0 ? 'ok' : 'not found (Detox iOS)',
  );
  addCheck(
    checks,
    fs.existsSync(path.join(REPO_ROOT, 'node_modules')),
    'node_modules',
    path.join(REPO_ROOT, 'node_modules'),
  );
  const rnDeclared = declaredDependency('react-native');
  const rnInstalled = packageVersion(
    path.join(REPO_ROOT, 'node_modules', 'react-native'),
  );
  addCheck(
    checks,
    Boolean(rnInstalled),
    'react-native',
    `installed=${rnInstalled || 'missing'} declared=${rnDeclared || 'missing'}`,
  );
  const detoxDeclared = declaredDependency('detox');
  const detoxInstalled = packageVersion(
    path.join(REPO_ROOT, 'node_modules', 'detox'),
  );
  addCheck(
    checks,
    Boolean(detoxInstalled),
    'detox',
    `installed=${detoxInstalled || 'missing'} declared=${detoxDeclared || 'missing'}`,
  );
  const nitroDeclared = declaredDependency(NITRO_PACKAGE);
  const nitroInstalled = packageVersion(
    path.join(REPO_ROOT, 'node_modules', NITRO_PACKAGE),
  );
  addCheck(
    checks,
    Boolean(
      nitroDeclared &&
      nitroInstalled &&
      stripVersionRange(nitroDeclared) === nitroInstalled,
    ),
    NITRO_PACKAGE,
    `installed=${nitroInstalled || 'missing'} declared=${nitroDeclared || 'missing'}`,
  );
  const runtimeList = runtimes || listSimulatorRuntimesSafe();
  const deviceList = devices || listSimulatorDevicesSafe();
  let selected = null;
  try {
    selected = resolveUdid({ udid, env, saved, devices: deviceList });
  } catch (error) {
    addCheck(
      checks,
      false,
      'device',
      error instanceof Error ? error.message : String(error),
    );
  }
  const device = selected
    ? deviceList.find((item) => item.udid === selected.udid) || null
    : null;
  if (selected) {
    addCheck(
      checks,
      Boolean(device && device.isAvailable),
      'device',
      device
        ? `${device.name} ${device.udid} ${device.runtimeId} source=${selected.source}`
        : `udid ${selected.udid} is not in simctl list; run setup`,
    );
    addCheck(
      checks,
      Boolean(device && device.deviceTypeId === DEVICE_TYPE_ID),
      'device type iPhone 15 Pro',
      device?.deviceTypeId || DEVICE_TYPE_ID,
    );
    const selectedRuntimeId = device?.runtimeId || saved?.runtimeId || null;
    const runtime = runtimeList.find(
      (item) => item.identifier === selectedRuntimeId && item.isAvailable,
    );
    const installed =
      runtimeList
        .filter((item) => item.isAvailable)
        .map((item) => item.identifier)
        .join(', ') || 'none';
    addCheck(
      checks,
      Boolean(runtime),
      'runtime',
      runtime
        ? runtime.identifier
        : `selected ${selectedRuntimeId || 'none'} is not available. installed: ${installed}`,
    );
  }
  const resolvedApp = resolveAppPath({ appPath, env, saved });
  const appExists = fs.existsSync(resolvedApp);
  addCheck(checks, appExists, 'app', resolvedApp);
  if (appExists) {
    const architectures = appArchitectures(resolvedApp);
    const nativeArch = hostNativeArch();
    addCheck(
      checks,
      architectures.includes(nativeArch),
      'app arch',
      `host=${nativeArch} app=${architectures.join(',') || 'unknown'}`,
    );
  }
  return checks;
}

export async function inspectPorts({
  ports = [METRO_PORT, FIXTURE_PORT],
} = {}) {
  const checks = [];
  for (const port of ports) {
    const busy = await portOpen(port);
    checks.push({
      ok: !busy,
      label: `port ${port}`,
      detail: busy ? `occupied; free 127.0.0.1:${port} before record` : 'free',
    });
  }
  return checks;
}

export function formatDoctorReport(checks) {
  return checks
    .map(
      (check) =>
        `${check.ok ? 'ok' : 'missing'} ${check.label} ${check.detail}`,
    )
    .join('\n');
}

export function doctorFailed(checks) {
  return checks.some((check) => !check.ok);
}

export async function runDoctor(mode, options = {}) {
  const checks =
    mode === 'record'
      ? inspectRecordEnvironment(options).concat(
          await inspectPorts({ ports: options.ports }),
        )
      : inspectPostTools();
  return {
    checks,
    ok: !doctorFailed(checks),
    report: formatDoctorReport(checks),
  };
}

export function setupSimulator({
  runtimeId = null,
  runtimes = null,
  devices = null,
  createDevice = null,
  filePath = ENVIRONMENT_PATH,
} = {}) {
  const runtimeList = runtimes || listSimulatorRuntimesSafe();
  const available = runtimeList.filter((runtime) => runtime.isAvailable);
  const requested = runtimeId || PREFERRED_RUNTIME_ID;
  const runtime = available.find((item) => item.identifier === requested);
  if (!runtime) {
    const installed =
      available.map((item) => item.identifier).join(', ') || 'none';
    throw new Error(
      `Runtime ${requested} is not installed. setup will not download or pick another runtime. Installed: ${installed}. Pass --runtime <id>.`,
    );
  }
  const deviceList = devices || listSimulatorDevicesSafe();
  const existing = findDedicatedDevice(deviceList, {
    name: DEVICE_NAME,
    runtimeId: runtime.identifier,
  });
  const other = findDedicatedDevice(deviceList, { name: DEVICE_NAME });
  if (!existing && other && other.runtimeId !== runtime.identifier) {
    throw new Error(
      `Found ${JSON.stringify(DEVICE_NAME)} on ${other.runtimeId}. Pass --runtime ${other.runtimeId} to reuse it, or rename/delete that device to create one on ${runtime.identifier}.`,
    );
  }
  let udid = existing?.udid || null;
  if (!udid) {
    const created = createDevice
      ? createDevice({
          name: DEVICE_NAME,
          deviceTypeId: DEVICE_TYPE_ID,
          runtimeId: runtime.identifier,
        })
      : createSimulatorDevice(runtime.identifier);
    udid = String(created || '').trim();
    if (!udid) {
      throw new Error('simctl create did not return a UDID');
    }
  }
  const config = {
    schemaVersion: 1,
    deviceName: DEVICE_NAME,
    deviceTypeId: DEVICE_TYPE_ID,
    deviceTypeName: DEVICE_TYPE_NAME,
    udid,
    runtimeId: runtime.identifier,
    appPath: DEFAULT_APP_PATH,
    createdAt: new Date().toISOString(),
  };
  const savedPath = writeSavedEnvironment(config, filePath);
  return { ...config, path: savedPath, created: !existing };
}

function createSimulatorDevice(runtimeId) {
  const result = runCapture('xcrun', [
    'simctl',
    'create',
    DEVICE_NAME,
    DEVICE_TYPE_ID,
    runtimeId,
  ]);
  if (result.status !== 0) {
    throw new Error(
      `simctl create failed:\n${(result.stderr || result.stdout || '').trim()}`,
    );
  }
  return result.stdout.trim();
}
