import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { helpText } from '../scripts/lib/args.mjs';

const skillDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(skillDir, 'scripts/cli.mjs');

test('help text documents the runnable CLI', () => {
  const text = helpText();
  assert.match(text, /--input/);
  assert.match(text, /--output/);
  assert.match(text, /--model/);
  assert.match(text, /gemini-3.5-flash-lite/);
  assert.match(text, /gemini-3.8-flash/);
  assert.match(text, /--thinking/);
  assert.match(text, /GEMINI_API_KEY/);
  assert.match(text, /gemini-translate/);
  assert.match(text, /gemini-api-key/);
  assert.match(text, /--project/);
  assert.match(text, /LOKALISE_TOKEN/);
  assert.match(text, /ENV-BIG-FE-APP-MONOREPO-DEV/);
});

test('cli --help exits 0 without calling the API', () => {
  const result = spawnSync(process.execPath, [cli, '--help'], {
    encoding: 'utf8',
    env: { ...process.env, GEMINI_API_KEY: '' },
    cwd: skillDir,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--input/);
  assert.equal(result.stdout.includes('AIza'), false);
});
