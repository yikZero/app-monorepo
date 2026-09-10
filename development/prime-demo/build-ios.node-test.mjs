/* cspell:ignore RNCORE xcodeproj pbxproj iphonesimulator codesign */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT_SOURCE = fileURLToPath(new URL('./build-ios.sh', import.meta.url));

const ORIGINAL_LOCK = 'LOCAL-EDIT-LOCK sentinel v1\n';
const ORIGINAL_PROJECT = 'LOCAL-EDIT-PROJECT sentinel v1\n';
const DEMO_LOCK = 'DEMO-LOCKED-PODFILE from environment\n';
const CACHED_PROJECT = 'CACHED-GENERATED-PROJECT should never be applied\n';
const TEST_UDID = 'TEST-UDID-393x852';

function writeExecutable(filePath, script) {
  fs.writeFileSync(filePath, script);
  fs.chmodSync(filePath, 0o755);
}

function iosPaths(repo) {
  return {
    lock: path.join(repo, 'apps/mobile/ios/Podfile.lock'),
    project: path.join(
      repo,
      'apps/mobile/ios/OneKeyWallet.xcodeproj/project.pbxproj',
    ),
    appDest: path.join(repo, '.tmp/prime-demo/native/OneKeyWallet.app'),
    logs: path.join(repo, '.stub-logs'),
  };
}

function seedRepo(t) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-build-ios-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));

  const iosDir = path.join(repo, 'apps/mobile/ios');
  const demoDir = path.join(repo, 'development/prime-demo');
  const binDir = path.join(repo, '.stub-bin');
  const logDir = path.join(repo, '.stub-logs');
  const tmpDir = path.join(repo, '.tmp');

  fs.mkdirSync(path.join(iosDir, 'OneKeyWallet.xcworkspace'), {
    recursive: true,
  });
  fs.mkdirSync(path.join(iosDir, 'OneKeyWallet.xcodeproj'), {
    recursive: true,
  });
  fs.mkdirSync(path.join(demoDir, 'environment'), { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  fs.copyFileSync(SCRIPT_SOURCE, path.join(demoDir, 'build-ios.sh'));
  fs.writeFileSync(path.join(demoDir, 'environment/Podfile.lock'), DEMO_LOCK);
  fs.writeFileSync(
    path.join(demoDir, 'environment/project.pbxproj'),
    CACHED_PROJECT,
  );
  fs.writeFileSync(path.join(iosDir, 'Podfile.lock'), ORIGINAL_LOCK);
  fs.writeFileSync(
    path.join(iosDir, 'OneKeyWallet.xcodeproj/project.pbxproj'),
    ORIGINAL_PROJECT,
  );

  writeExecutable(
    path.join(binDir, 'pod'),
    `#!/bin/sh
set -eu
log_dir=\${PRIME_DEMO_STUB_LOG_DIR:?}
{
  echo "args: $*"
  echo "RCT_USE_RN_DEP=\${RCT_USE_RN_DEP-}"
  echo "RCT_USE_PREBUILT_RNCORE=\${RCT_USE_PREBUILT_RNCORE-}"
  echo "lock=$(cat Podfile.lock)"
} >> "$log_dir/pod.log"
printf '%s\\n' 'POD-MUTATED-LOCK' > Podfile.lock
printf '%s\\n' 'POD-MUTATED-PROJECT' > OneKeyWallet.xcodeproj/project.pbxproj
if [ "\${PRIME_DEMO_POD_FAIL:-0}" = "1" ]; then
  exit 1
fi
`,
  );

  writeExecutable(
    path.join(binDir, 'xcodebuild'),
    `#!/bin/sh
set -eu
log_dir=\${PRIME_DEMO_STUB_LOG_DIR:?}
{
  echo "args: $*"
  echo "SKIP_BUNDLING=\${SKIP_BUNDLING-}"
  echo "SENTRY_DISABLE_AUTO_UPLOAD=\${SENTRY_DISABLE_AUTO_UPLOAD-}"
  echo "ENABLE_NATIVE_BACKGROUND_THREAD=\${ENABLE_NATIVE_BACKGROUND_THREAD-}"
} >> "$log_dir/xcodebuild.log"
derived=""
prev=""
for arg in "$@"; do
  if [ "$prev" = "-derivedDataPath" ]; then
    derived=$arg
  fi
  prev=$arg
done
if [ -z "$derived" ]; then
  echo "xcodebuild stub missing -derivedDataPath" >&2
  exit 1
fi
app="$derived/Build/Products/Debug-iphonesimulator/OneKeyWallet.app"
mkdir -p "$app/Frameworks/GPChannelSDKCore.framework"
printf '%s\\n' 'stub-app' > "$app/Info.plist"
printf '%s\\n' 'stub-gp' > "$app/Frameworks/GPChannelSDKCore.framework/GPChannelSDKCore"
`,
  );

  writeExecutable(
    path.join(binDir, 'codesign'),
    `#!/bin/sh
set -eu
log_dir=\${PRIME_DEMO_STUB_LOG_DIR:?}
echo "args: $*" >> "$log_dir/codesign.log"
`,
  );

  writeExecutable(
    path.join(binDir, 'git'),
    `#!/bin/sh
set -eu
log_dir=\${PRIME_DEMO_STUB_LOG_DIR:?}
echo "args: $*" >> "$log_dir/git.log"
echo "git must not restore tracked iOS files" >&2
exit 64
`,
  );

  return repo;
}

function runBuildIos(repo, { extraArgs = [], podFail = false } = {}) {
  const binDir = path.join(repo, '.stub-bin');
  const logDir = path.join(repo, '.stub-logs');
  const tmpDir = path.join(repo, '.tmp');
  return spawnSync(
    'sh',
    ['development/prime-demo/build-ios.sh', '--udid', TEST_UDID, ...extraArgs],
    {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
        PRIME_DEMO_STUB_LOG_DIR: logDir,
        PRIME_DEMO_POD_FAIL: podFail ? '1' : '0',
        TMPDIR: tmpDir,
      },
    },
  );
}

function readLog(repo, name) {
  const file = path.join(iosPaths(repo).logs, name);
  assert.ok(fs.existsSync(file), `missing stub log ${name}`);
  return fs.readFileSync(file, 'utf8');
}

function assertOriginalsRestored(repo) {
  const { lock, project } = iosPaths(repo);
  assert.equal(fs.readFileSync(lock, 'utf8'), ORIGINAL_LOCK);
  assert.equal(fs.readFileSync(project, 'utf8'), ORIGINAL_PROJECT);
}

function assertLockedPodInstall(repo) {
  const podLog = readLog(repo, 'pod.log');
  assert.match(podLog, /args: install --deployment/);
  assert.match(podLog, /RCT_USE_RN_DEP=0/);
  assert.match(podLog, /RCT_USE_PREBUILT_RNCORE=0/);
  assert.match(podLog, /lock=DEMO-LOCKED-PODFILE from environment/);
}

function assertSignedAppCopied(repo) {
  const { appDest } = iosPaths(repo);
  const xcodeLog = readLog(repo, 'xcodebuild.log');
  const codesignLog = readLog(repo, 'codesign.log');
  assert.match(xcodeLog, new RegExp(`-destination id=${TEST_UDID}`));
  assert.match(xcodeLog, /CODE_SIGNING_ALLOWED=NO/);
  assert.match(xcodeLog, /ONLY_ACTIVE_ARCH=YES/);
  assert.match(xcodeLog, /SKIP_BUNDLING=1/);
  assert.match(xcodeLog, /SENTRY_DISABLE_AUTO_UPLOAD=true/);
  assert.match(xcodeLog, /ENABLE_NATIVE_BACKGROUND_THREAD=false/);
  assert.match(codesignLog, /--force --sign -/);
  assert.match(codesignLog, /GPChannelSDKCore/);
  assert.match(codesignLog, /--force --deep --sign -/);
  assert.ok(fs.existsSync(path.join(appDest, 'Info.plist')));
  assert.equal(
    fs.readFileSync(path.join(appDest, 'Info.plist'), 'utf8'),
    'stub-app\n',
  );
}

test('usage documents --install-pods as a no-op compatibility alias', () => {
  const result = spawnSync('sh', [SCRIPT_SOURCE, '--help'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /no-op compatibility alias/);
  assert.match(result.stderr, /locked pod install --deployment/);
  assert.match(result.stderr, /project\.pbxproj/);
});

test('restores locally altered lock and project after a successful build', (t) => {
  const repo = seedRepo(t);
  const result = runBuildIos(repo);
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 0, combined);
  assert.match(result.stdout, /built /);
  assertLockedPodInstall(repo);
  assertSignedAppCopied(repo);
  assertOriginalsRestored(repo);
  assert.ok(!fs.existsSync(path.join(iosPaths(repo).logs, 'git.log')));
});

test('--install-pods remains a no-op alias and still restores originals', (t) => {
  const repo = seedRepo(t);
  const result = runBuildIos(repo, { extraArgs: ['--install-pods'] });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assertLockedPodInstall(repo);
  assertSignedAppCopied(repo);
  assertOriginalsRestored(repo);
});

test('restores originals after failed pod install and does not build', (t) => {
  const repo = seedRepo(t);
  const result = runBuildIos(repo, { podFail: true });
  assert.notEqual(result.status, 0);
  assertLockedPodInstall(repo);
  assert.ok(!fs.existsSync(path.join(iosPaths(repo).logs, 'xcodebuild.log')));
  assert.ok(!fs.existsSync(path.join(iosPaths(repo).logs, 'codesign.log')));
  assert.ok(!fs.existsSync(iosPaths(repo).appDest));
  assertOriginalsRestored(repo);
});

test('missing project fails before mutation and does not run pod', (t) => {
  const repo = seedRepo(t);
  fs.rmSync(iosPaths(repo).project);
  const result = runBuildIos(repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Tracked Xcode project missing/);
  assert.equal(fs.readFileSync(iosPaths(repo).lock, 'utf8'), ORIGINAL_LOCK);
  assert.ok(!fs.existsSync(path.join(iosPaths(repo).logs, 'pod.log')));
  assert.ok(!fs.existsSync(path.join(iosPaths(repo).logs, 'xcodebuild.log')));
});
