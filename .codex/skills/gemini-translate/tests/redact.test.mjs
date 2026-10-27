/* eslint-disable onekey/no-raw-error -- Standalone CLI uses native Node errors without the application runtime. */
// All credential strings below are synthetic offline test fixtures.
import assert from 'node:assert/strict';
import test from 'node:test';

import { readApiKey, readLokaliseToken } from '../scripts/lib/credentials.mjs';
import { redact, toPublicError } from '../scripts/lib/redact.mjs';

const SECRET = 'AIzaSyDummyTestKeyValueNotReal0001';

test('redacts API key material from strings', () => {
  const raw = [
    `Authorization: Bearer ${SECRET}`,
    `https://generativelanguage.googleapis.com/v1beta/models?key=${SECRET}`,
    `x-goog-api-key: ${SECRET}`,
    `x-api-token: ${SECRET}`,
    `env GEMINI_API_KEY=${SECRET}`,
  ].join('\n');
  const cleaned = redact(raw, [SECRET]);
  assert.equal(cleaned.includes(SECRET), false);
  assert.equal(cleaned.includes('AIza'), false);
  assert.match(cleaned, /\[redacted\]/);
});

test('toPublicError drops secret text and keeps timing fields', () => {
  const err = new Error(`Request failed for key=${SECRET}`);
  err.status = 429;
  err.attempts = 3;
  err.retries = 2;
  err.elapsedMs = 40;
  err.attemptElapsedMs = [10, 10, 20];
  const pub = toPublicError(err, [SECRET]);
  assert.equal(pub.message.includes(SECRET), false);
  assert.equal(pub.status, 429);
  assert.equal(pub.attempts, 3);
  assert.deepEqual(pub.attemptElapsedMs, [10, 10, 20]);
});

test('GEMINI_API_KEY wins over Keychain', () => {
  const key = readApiKey({
    env: { GEMINI_API_KEY: '  env-key-value  ' },
    platform: 'darwin',
    execFileSyncFn() {
      throw new Error('should not call keychain');
    },
  });
  assert.equal(key, 'env-key-value');
});

test('Keychain lookup uses execFileSync without a shell and never leaks stdout', () => {
  let captured;
  const key = readApiKey({
    env: {},
    platform: 'darwin',
    execFileSyncFn(cmd, args, opts) {
      captured = { cmd, args, opts };
      return `${SECRET}\n`;
    },
  });
  assert.equal(key, SECRET);
  assert.equal(captured.cmd, 'security');
  assert.deepEqual(captured.args, [
    'find-generic-password',
    '-s',
    'gemini-translate',
    '-a',
    'gemini-api-key',
    '-w',
  ]);
  assert.equal(captured.opts.shell, undefined);
  assert.notEqual(captured.opts.shell, true);

  assert.throws(
    () =>
      readApiKey({
        env: {},
        platform: 'darwin',
        execFileSyncFn() {
          const failure = new Error('Command failed');
          failure.stdout = SECRET;
          failure.stderr = 'security: item not found';
          throw failure;
        },
      }),
    (err) => {
      assert.equal(err.message.includes(SECRET), false);
      assert.match(err.message, /Keychain/);
      return true;
    },
  );
});

test('LOKALISE_TOKEN uses a separate Keychain service and never leaks stdout', () => {
  let captured;
  const token = readLokaliseToken({
    env: {},
    platform: 'darwin',
    execFileSyncFn(cmd, args, opts) {
      captured = { cmd, args, opts };
      return 'lokalise-dummy-token-not-real\n';
    },
  });
  assert.equal(token, 'lokalise-dummy-token-not-real');
  assert.deepEqual(captured.args, [
    'find-generic-password',
    '-s',
    'ENV-BIG-FE-APP-MONOREPO-DEV',
    '-a',
    'LOKALISE_TOKEN',
    '-w',
  ]);
  assert.equal(captured.opts.shell, undefined);

  const envToken = readLokaliseToken({
    env: { LOKALISE_TOKEN: '  env-lokalise-token  ' },
    platform: 'darwin',
    execFileSyncFn() {
      throw new Error('should not call keychain');
    },
  });
  assert.equal(envToken, 'env-lokalise-token');

  assert.throws(
    () =>
      readLokaliseToken({
        env: {},
        platform: 'darwin',
        execFileSyncFn() {
          const failure = new Error('Command failed');
          failure.stdout = 'lokalise-dummy-token-not-real';
          throw failure;
        },
      }),
    (err) => {
      assert.equal(
        err.message.includes('lokalise-dummy-token-not-real'),
        false,
      );
      assert.match(err.message, /LOKALISE_TOKEN/);
      return true;
    },
  );
});
