import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { parseDemoArgs } from './demo.mjs';
import {
  DEVICE_NAME,
  DEVICE_TYPE_ID,
  PREFERRED_RUNTIME_ID,
  findDedicatedDevice,
  inspectPorts,
  inspectPostTools,
  inspectRecordEnvironment,
  nodeVersionAtLeast,
  parseSimctlDeviceList,
  resolveAppPath,
  resolveUdid,
  setupSimulator,
} from './environment.mjs';
import { DEFAULT_APP_PATH, parseArgs as parseRunArgs } from './run.mjs';

const IPHONE_15_PRO = {
  name: DEVICE_NAME,
  deviceTypeId: DEVICE_TYPE_ID,
  isAvailable: true,
};

test('doctor and setup CLI parsing', () => {
  const doctor = parseDemoArgs(['doctor', 'record']);
  assert.equal(doctor.command, 'doctor');
  assert.equal(doctor.target, 'record');
  const setup = parseDemoArgs([
    'setup',
    '--runtime',
    'com.apple.CoreSimulator.SimRuntime.iOS-26-5',
  ]);
  assert.equal(setup.command, 'setup');
  assert.equal(setup.runtime, 'com.apple.CoreSimulator.SimRuntime.iOS-26-5');
  const build = parseDemoArgs(['build-ios', '--install-pods', '--udid', 'abc']);
  assert.equal(build.command, 'build-ios');
  assert.equal(build.installPods, true);
  assert.equal(build.udid, 'abc');
  assert.throws(() => parseDemoArgs(['render', 'feat', '--runtime', 'x']), {
    message: /--runtime/,
  });
  assert.throws(() => parseDemoArgs(['record', 'feat', '--install-pods']), {
    message: /--install-pods/,
  });
});

test('resolveUdid prefers flag, then env, then saved, then dedicated device', () => {
  const devices = [
    {
      udid: 'dedicated-id',
      runtimeId: PREFERRED_RUNTIME_ID,
      ...IPHONE_15_PRO,
    },
  ];
  assert.equal(
    resolveUdid({ udid: 'flag-id', env: {}, saved: null, devices }).udid,
    'flag-id',
  );
  assert.equal(
    resolveUdid({
      udid: null,
      env: { PRIME_DEMO_UDID: 'env-id' },
      saved: { udid: 'saved-id' },
      devices,
    }).source,
    'env',
  );
  assert.equal(
    resolveUdid({
      udid: null,
      env: {},
      saved: { udid: 'saved-id' },
      devices,
    }).udid,
    'saved-id',
  );
  assert.equal(
    resolveUdid({ udid: null, env: {}, saved: null, devices }).source,
    'dedicated',
  );
  assert.throws(
    () => resolveUdid({ udid: null, env: {}, saved: null, devices: [] }),
    /demo.mjs setup/,
  );
});

test('resolveUdid does not require the legacy hard-coded UDID', () => {
  assert.throws(
    () => resolveUdid({ udid: null, env: {}, saved: null, devices: [] }),
    /setup/,
  );
});

test('resolveAppPath uses flag, env, saved, then the .tmp package', () => {
  assert.equal(
    resolveAppPath({ appPath: '/tmp/a.app', env: {}, saved: null }),
    path.resolve('/tmp/a.app'),
  );
  assert.equal(
    resolveAppPath({
      appPath: null,
      env: { PRIME_DEMO_APP_PATH: '/tmp/env.app' },
      saved: { appPath: '/tmp/saved.app' },
    }),
    path.resolve('/tmp/env.app'),
  );
  assert.equal(
    resolveAppPath({
      appPath: null,
      env: {},
      saved: { appPath: '/tmp/saved.app' },
    }),
    path.resolve('/tmp/saved.app'),
  );
  assert.equal(
    resolveAppPath({ appPath: null, env: {}, saved: null }),
    DEFAULT_APP_PATH,
  );
});

test('run parseArgs no longer fills the legacy UDID by default', () => {
  const options = parseRunArgs([
    '--fixture',
    'fix.json',
    '--take-dir',
    'takes/one',
  ]);
  assert.equal(options.udid, null);
  assert.equal(options.appPath, null);
});

test('setup reuses a matching dedicated device and refuses a silent runtime upgrade', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-env-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const envPath = path.join(dir, '.environment.json');
  const runtimes = [
    { identifier: PREFERRED_RUNTIME_ID, name: 'iOS 26.5', isAvailable: true },
    {
      identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-0',
      name: 'iOS 18.0',
      isAvailable: true,
    },
  ];
  const devices = [
    {
      udid: 'existing-26',
      runtimeId: PREFERRED_RUNTIME_ID,
      ...IPHONE_15_PRO,
    },
  ];
  const reused = setupSimulator({
    runtimes,
    devices,
    filePath: envPath,
    createDevice: () => {
      throw new Error('should not create');
    },
  });
  assert.equal(reused.udid, 'existing-26');
  assert.equal(reused.created, false);
  assert.equal(reused.path, envPath);

  const otherRuntime = [
    {
      udid: 'existing-18',
      runtimeId: 'com.apple.CoreSimulator.SimRuntime.iOS-18-0',
      ...IPHONE_15_PRO,
    },
  ];
  assert.throws(
    () =>
      setupSimulator({
        runtimeId: PREFERRED_RUNTIME_ID,
        runtimes,
        devices: otherRuntime,
        filePath: envPath,
        createDevice: () => 'new-id',
      }),
    /Pass --runtime/,
  );
  assert.throws(
    () =>
      setupSimulator({
        runtimeId: 'com.apple.CoreSimulator.SimRuntime.iOS-99-0',
        runtimes,
        devices: [],
        filePath: envPath,
        createDevice: () => 'nope',
      }),
    /will not download/,
  );
});

test('findDedicatedDevice requires iPhone 15 Pro device type, not only the name', () => {
  const found = findDedicatedDevice(
    parseSimctlDeviceList({
      devices: {
        [PREFERRED_RUNTIME_ID]: [
          {
            udid: 'abc',
            name: DEVICE_NAME,
            isAvailable: true,
            deviceTypeIdentifier: DEVICE_TYPE_ID,
          },
        ],
      },
    }),
  );
  assert.equal(found.udid, 'abc');
  const wrongType = findDedicatedDevice([
    {
      udid: 'nope',
      name: DEVICE_NAME,
      runtimeId: PREFERRED_RUNTIME_ID,
      isAvailable: true,
      deviceTypeId: 'com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro',
    },
  ]);
  assert.equal(wrongType, null);
});

test('nodeVersionAtLeast requires 22.12, not merely 22', () => {
  assert.equal(nodeVersionAtLeast('22.12.0'), true);
  assert.equal(nodeVersionAtLeast('v22.14.0'), true);
  assert.equal(nodeVersionAtLeast('22.11.9'), false);
  assert.equal(nodeVersionAtLeast('21.18.0'), false);
});

test('inspectPorts fails occupied check ports and does not mention reuse-services', async (t) => {
  const server = net.createServer();
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  const checks = await inspectPorts({ ports: [port] });
  assert.equal(checks.length, 1);
  assert.equal(checks[0].ok, false);
  assert.match(checks[0].detail, new RegExp(`free 127\\.0\\.0\\.1:${port}`));
  assert.doesNotMatch(checks[0].detail, /reuse-services/);
});

test('doctor record uses env over saved and the selected runtime, not a preferred one', () => {
  const altRuntime = 'com.apple.CoreSimulator.SimRuntime.iOS-18-0';
  const checks = inspectRecordEnvironment({
    env: { PRIME_DEMO_UDID: 'env-id' },
    saved: {
      udid: 'saved-id',
      runtimeId: PREFERRED_RUNTIME_ID,
    },
    devices: [
      {
        udid: 'env-id',
        runtimeId: altRuntime,
        ...IPHONE_15_PRO,
      },
      {
        udid: 'saved-id',
        runtimeId: PREFERRED_RUNTIME_ID,
        ...IPHONE_15_PRO,
      },
    ],
    runtimes: [
      { identifier: altRuntime, name: 'iOS 18.0', isAvailable: true },
      {
        identifier: PREFERRED_RUNTIME_ID,
        name: 'iOS 26.5',
        isAvailable: false,
      },
    ],
  });
  const byLabel = Object.fromEntries(
    checks.map((check) => [check.label, check]),
  );
  assert.match(byLabel.device.detail, /env-id/);
  assert.match(byLabel.device.detail, /source=env/);
  assert.equal(byLabel.runtime.ok, true);
  assert.equal(byLabel.runtime.detail, altRuntime);
  assert.equal(byLabel['runtime iOS-26-5'], undefined);
});

test('inspectPostTools returns compact node/ffmpeg/sh checks', () => {
  const checks = inspectPostTools();
  const labels = new Set(checks.map((check) => check.label));
  assert.ok(labels.has('node'));
  assert.ok(labels.has('ffmpeg'));
  assert.ok(labels.has('ffprobe'));
  assert.ok(labels.has('sh'));
  assert.ok(labels.has('encoder libx264'));
  assert.ok(labels.has('filter setparams'));
  assert.ok(labels.has('filter alphamerge'));
  const node = checks.find((check) => check.label === 'node');
  assert.match(node.detail, />=22\.12\.0/);
});
