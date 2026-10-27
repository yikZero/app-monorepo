/* eslint-disable onekey/no-raw-error -- Standalone CLI uses native Node errors without the application runtime. */
import { execFileSync } from 'node:child_process';

import {
  KEYCHAIN_ACCOUNT,
  KEYCHAIN_SERVICE,
  LOKALISE_KEYCHAIN_ACCOUNT,
  LOKALISE_KEYCHAIN_SERVICE,
  LOKALISE_TOKEN_ENV,
} from './constants.mjs';

export function readApiKey(opts = {}) {
  return readKeychainOrEnv({
    envKey: 'GEMINI_API_KEY',
    service: KEYCHAIN_SERVICE,
    account: KEYCHAIN_ACCOUNT,
    missingEnv:
      'GEMINI_API_KEY is not set. On macOS the CLI can also read Keychain service gemini-translate account gemini-api-key.',
    keychainFail: `Failed to read Gemini API key from Keychain (service ${KEYCHAIN_SERVICE}, account ${KEYCHAIN_ACCOUNT}). Set GEMINI_API_KEY instead.`,
    ...opts,
  });
}

export function readLokaliseToken(opts = {}) {
  return readKeychainOrEnv({
    envKey: LOKALISE_TOKEN_ENV,
    service: LOKALISE_KEYCHAIN_SERVICE,
    account: LOKALISE_KEYCHAIN_ACCOUNT,
    missingEnv:
      'LOKALISE_TOKEN is not set. On macOS the CLI can also read Keychain service ENV-BIG-FE-APP-MONOREPO-DEV account LOKALISE_TOKEN.',
    keychainFail:
      'Failed to read Lokalise token from Keychain (service ENV-BIG-FE-APP-MONOREPO-DEV, account LOKALISE_TOKEN). Set LOKALISE_TOKEN instead.',
    ...opts,
  });
}

export function readKeychainOrEnv({
  envKey,
  service,
  account,
  missingEnv,
  keychainFail,
  env = process.env,
  platform = process.platform,
  execFileSyncFn = execFileSync,
} = {}) {
  const fromEnv = typeof env[envKey] === 'string' ? env[envKey].trim() : '';
  if (fromEnv) return fromEnv;

  if (platform !== 'darwin') {
    throw new Error(missingEnv);
  }

  try {
    const value = execFileSyncFn(
      'security',
      ['find-generic-password', '-s', service, '-a', account, '-w'],
      {
        encoding: 'utf8',
        timeout: 15_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
      .toString()
      .trim();
    if (!value) {
      throw new Error('Keychain returned an empty password');
    }
    return value;
  } catch {
    throw new Error(keychainFail);
  }
}
