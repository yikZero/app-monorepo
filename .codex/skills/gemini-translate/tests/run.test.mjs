import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseArgs } from '../scripts/lib/args.mjs';
import { buildGenerateConfig } from '../scripts/lib/client.mjs';
import { runCli, runTranslate } from '../scripts/lib/run.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sampleInput = JSON.parse(
  readFileSync(join(root, 'fixtures/sample-input.json'), 'utf8'),
);
const sampleBody = JSON.parse(
  readFileSync(join(root, 'fixtures/sample-translations.json'), 'utf8'),
);

const SECRET = 'AIzaSyDummyTestKeyValueNotReal0002';

function completeResponse(overrides = {}) {
  return {
    text: JSON.stringify(sampleBody),
    usageMetadata: {
      promptTokenCount: 11,
      candidatesTokenCount: 22,
      totalTokenCount: 33,
    },
    candidates: [{ finishReason: 'STOP' }],
    ...overrides,
  };
}

test('omits thinkingConfig unless --thinking is set', () => {
  const omitted = buildGenerateConfig({});
  assert.equal(omitted.thinkingConfig, undefined);
  assert.equal(omitted.responseMimeType, 'application/json');
  assert.ok(omitted.responseJsonSchema);

  const enabled = buildGenerateConfig({ thinking: 'low' });
  assert.deepEqual(enabled.thinkingConfig, {
    thinkingLevel: 'LOW',
    includeThoughts: false,
  });
});

test('CLI defaults to gemini-3.8-flash with low thinking; explicit lite omits thinking', () => {
  const defaults = parseArgs(['--input', 'a.json', '--output', 'b.json']);
  assert.equal(defaults.model, 'gemini-3.8-flash');
  assert.equal(defaults.thinking, 'low');
  assert.deepEqual(
    buildGenerateConfig({ thinking: defaults.thinking }).thinkingConfig,
    {
      thinkingLevel: 'LOW',
      includeThoughts: false,
    },
  );

  const lite = parseArgs([
    '--input',
    'a.json',
    '--output',
    'b.json',
    '--model',
    'gemini-3.5-flash-lite',
  ]);
  assert.equal(lite.model, 'gemini-3.5-flash-lite');
  assert.equal(lite.thinking, null);
  assert.equal(
    buildGenerateConfig({ thinking: lite.thinking }).thinkingConfig,
    undefined,
  );

  const override = parseArgs([
    '--input',
    'a.json',
    '--output',
    'b.json',
    '--model',
    'gemini-3.5-flash-lite',
    '--thinking',
    'minimal',
  ]);
  assert.equal(override.thinking, 'minimal');
});

test('parseArgs rejects unknown models and illegal thinking levels', () => {
  assert.throws(
    () =>
      parseArgs([
        '--input',
        'a.json',
        '--output',
        'b.json',
        '--model',
        'gemini-2.5-flash',
      ]),
    /No automatic fallback/,
  );
  assert.throws(
    () =>
      parseArgs([
        '--input',
        'a.json',
        '--output',
        'b.json',
        '--model',
        'gemini-3.8-flash',
        '--thinking',
        'minimal',
      ]),
    /Unsupported --thinking minimal/,
  );
});

test('successful mock translation returns metrics and stable ids', async () => {
  const output = await runTranslate({
    input: sampleInput,
    model: 'gemini-3.5-flash-lite',
    getApiKey: () => SECRET,
    generateContent: async () => completeResponse(),
    sleep: async () => {},
    now: sequentialNow(),
  });
  assert.equal(output.model, 'gemini-3.5-flash-lite');
  assert.equal(output.translations.length, 30);
  assert.equal(output.translations[0].id, 'confirm_action');
  assert.equal(output.translations[0].language, 'zh-CN');
  assert.equal(output.attempts, 1);
  assert.equal(output.retries, 0);
  assert.equal(output.attemptElapsedMs.length, 1);
  assert.equal(typeof output.elapsedMs, 'number');
  assert.deepEqual(output.usageMetadata, {
    promptTokenCount: 11,
    candidatesTokenCount: 22,
    totalTokenCount: 33,
  });
  assert.equal(output.thinking, undefined);
});

test('retries transient failures at most twice and records attempt timing', async () => {
  let calls = 0;
  const output = await runTranslate({
    input: sampleInput,
    model: 'gemini-3.5-flash-lite',
    getApiKey: () => SECRET,
    sleep: async () => {},
    now: sequentialNow(),
    generateContent: async () => {
      calls += 1;
      if (calls < 3) {
        const err = new Error(`Resource exhausted key=${SECRET}`);
        err.status = 429;
        throw err;
      }
      return completeResponse();
    },
  });
  assert.equal(calls, 3);
  assert.equal(output.attempts, 3);
  assert.equal(output.retries, 2);
  assert.equal(output.attemptElapsedMs.length, 3);
});

test('does not retry non-transient errors or invent translations', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      runTranslate({
        input: sampleInput,
        model: 'gemini-3.5-flash-lite',
        getApiKey: () => SECRET,
        sleep: async () => {},
        generateContent: async () => {
          calls += 1;
          const err = new Error(`invalid argument key=${SECRET}`);
          err.status = 400;
          throw err;
        },
      }),
    (err) => {
      assert.equal(calls, 1);
      assert.equal(err.message.includes(SECRET), false);
      assert.match(err.message, /Gemini API request failed/);
      assert.equal(err.translations, undefined);
      assert.equal(err.attempts, 1);
      return true;
    },
  );
});

test('incomplete model JSON fails validation instead of filling gaps', async () => {
  const incomplete = {
    translations: sampleBody.translations.filter(
      (row) => row.id !== 'open_wallet',
    ),
  };
  await assert.rejects(
    () =>
      runTranslate({
        input: sampleInput,
        model: 'gemini-3.5-flash-lite',
        getApiKey: () => SECRET,
        generateContent: async () => ({
          text: JSON.stringify(incomplete),
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 1,
            totalTokenCount: 2,
          },
          candidates: [{ finishReason: 'STOP' }],
        }),
      }),
    (err) => {
      assert.match(err.message, /Translation validation failed/);
      assert.match(err.message, /missing translation for id open_wallet/);
      return true;
    },
  );
});

test('runCli writes output only after success and redacts failures', async () => {
  const files = new Map();
  files.set('/tmp/in.json', JSON.stringify(sampleInput));
  const written = new Map();

  await runCli(
    {
      input: '/tmp/in.json',
      output: '/tmp/out.json',
      model: 'gemini-3.5-flash-lite',
      thinking: null,
    },
    {
      readFileSync: (path) => files.get(path),
      writeFileSync: (path, contents) => {
        written.set(path, contents);
      },
      getApiKey: () => SECRET,
      generateContent: async () => completeResponse(),
      sleep: async () => {},
      now: sequentialNow(),
    },
  );
  assert.equal(written.size, 1);
  const parsed = JSON.parse(written.get('/tmp/out.json'));
  assert.equal(parsed.translations.length, 30);

  const failedWrites = new Map();
  await assert.rejects(
    () =>
      runCli(
        {
          input: '/tmp/in.json',
          output: '/tmp/out.json',
          model: 'gemini-3.5-flash-lite',
          thinking: null,
        },
        {
          readFileSync: (path) => files.get(path),
          writeFileSync: (path, contents) => {
            failedWrites.set(path, contents);
          },
          getApiKey: () => SECRET,
          generateContent: async () => {
            const err = new Error(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${SECRET}`,
            );
            err.status = 503;
            throw err;
          },
          sleep: async () => {},
        },
      ),
    (err) => {
      assert.equal(failedWrites.size, 0);
      assert.equal(err.message.includes(SECRET), false);
      assert.match(err.message, /\[redacted\]/);
      return true;
    },
  );
});

function sequentialNow() {
  let t = 1000;
  return () => {
    t += 5;
    return t;
  };
}
