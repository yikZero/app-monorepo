/* eslint-disable onekey/no-raw-error -- Standalone CLI uses native Node errors without the application runtime. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs } from '../scripts/lib/args.mjs';
import { PROJECTS } from '../scripts/lib/constants.mjs';
import {
  languagesUrl,
  resolveProjectLanguages,
  sameLanguageSet,
} from '../scripts/lib/lokalise.mjs';
import { runCli } from '../scripts/lib/run.mjs';

const GEMINI_SECRET = 'AIzaSyDummyTestKeyValueNotReal0003';
const LOKALISE_SECRET = 'lokalise-dummy-token-not-real-0003';

const CLIENT_LANGS = ['en_US', 'zh_CN', 'zh_TW', 'zh_HK', 'ja', 'qaa_NEW'];
const SERVER_LANGS = ['en-us', 'zh-cn', 'zh-tw', 'zh-hk', 'ja'];

const projectInput = {
  sourceLanguage: 'en_US',
  items: [
    { id: 'confirm_action', text: 'Confirm' },
    { id: 'send_amount', text: 'Send {amount} {symbol}' },
  ],
};

test('parseArgs accepts client and server and rejects unknown aliases', () => {
  const client = parseArgs([
    '--input',
    'a.json',
    '--output',
    'b.json',
    '--project',
    'client',
  ]);
  assert.equal(client.project, 'client');
  assert.equal(client.model, 'gemini-3.8-flash');
  assert.equal(client.thinking, 'low');

  const server = parseArgs([
    '--input',
    'a.json',
    '--output',
    'b.json',
    '--project',
    'server',
  ]);
  assert.equal(server.project, 'server');

  const none = parseArgs(['--input', 'a.json', '--output', 'b.json']);
  assert.equal(none.project, null);

  assert.throws(
    () =>
      parseArgs([
        '--input',
        'a.json',
        '--output',
        'b.json',
        '--project',
        'other',
      ]),
    /Unsupported --project other/,
  );
});

test('resolves client and server aliases with exact API codes and provenance', async () => {
  for (const [alias, languages, baseLanguage] of [
    ['client', CLIENT_LANGS, 'en_US'],
    ['server', SERVER_LANGS, 'en-us'],
  ]) {
    const spec = PROJECTS[alias];
    const { fetchFn, requests } = mockLokalise({
      alias,
      languagesByPage: [languages],
      baseLanguage,
    });
    let geminiInput;
    let geminiCalls = 0;
    const written = new Map();
    const output = await runCli(cliArgs({ project: alias }), {
      ...ioFiles({ ...projectInput }),
      writeFileSync: (path, contents) => written.set(path, contents),
      getApiKey: () => GEMINI_SECRET,
      getLokaliseToken: () => LOKALISE_SECRET,
      fetchFn,
      generateContent: async ({ input }) => {
        geminiCalls += 1;
        geminiInput = input;
        assert.equal(JSON.stringify(input).includes(LOKALISE_SECRET), false);
        return modelResponse(input);
      },
    });

    assert.equal(geminiCalls, 1);
    assert.deepEqual(geminiInput.targetLanguages, languages);
    assert.equal(output.project.alias, alias);
    assert.equal(output.project.id, spec.id);
    assert.equal(output.project.name, spec.name);
    assert.equal(output.project.baseLanguage, baseLanguage);
    assert.deepEqual(output.targetLanguages, languages);
    assert.equal(
      output.translations.length,
      languages.length * projectInput.items.length,
    );
    assert.equal(written.size, 1);
    assert.match(requests[0].url, new RegExp(`/projects/${spec.id}$`));
    assert.match(requests[1].url, new RegExp(`/projects/${spec.id}/languages`));
    assert.equal(requests[0].options.redirect, 'error');
    assert.equal(requests[0].options.headers['X-Api-Token'], LOKALISE_SECRET);
    assert.notEqual(requests[0].options.headers['X-Api-Token'], GEMINI_SECRET);
  }
});

test('paginates languages and picks up a new locale not in the mapping', async () => {
  const spec = PROJECTS.client;
  const page1 = ['en_US', 'zh_CN'];
  const page2 = ['zh_TW', 'qaa_NEW'];
  const page3 = ['ja'];
  const { fetchFn, requests } = mockLokalise({
    alias: 'client',
    languagesByPage: [page1, page2, page3],
  });
  let geminiInput;
  const resolved = await resolveProjectLanguages({
    alias: 'client',
    token: LOKALISE_SECRET,
    fetchFn,
    pageLimit: 2,
  });
  assert.deepEqual(resolved.languages, [
    'en_US',
    'zh_CN',
    'zh_TW',
    'qaa_NEW',
    'ja',
  ]);
  assert.ok(resolved.languages.includes('qaa_NEW'));
  assert.equal(
    requests.filter((row) => row.url.includes('/languages')).length,
    3,
  );
  assert.match(requests[1].url, /limit=2/);
  assert.match(requests[1].url, /page=1/);
  assert.match(requests[2].url, /page=2/);
  assert.match(requests[3].url, /page=3/);

  const defaultLimit = mockLokalise({
    alias: 'client',
    languagesByPage: [CLIENT_LANGS],
  });
  await resolveProjectLanguages({
    alias: 'client',
    token: LOKALISE_SECRET,
    fetchFn: defaultLimit.fetchFn,
  });
  assert.equal(
    defaultLimit.requests.some(
      (row) => row.url === languagesUrl(spec.id, 1, 500),
    ),
    true,
  );

  const live = mockLokalise({
    alias: 'client',
    languagesByPage: [['en_US', 'zh_CN', 'zh_TW', 'qaa_NEW']],
  });
  await runCli(cliArgs({ project: 'client' }), {
    ...ioFiles({ ...projectInput }),
    writeFileSync() {},
    getApiKey: () => GEMINI_SECRET,
    getLokaliseToken: () => LOKALISE_SECRET,
    fetchFn: live.fetchFn,
    generateContent: async ({ input }) => {
      geminiInput = input;
      return modelResponse(input);
    },
  });
  assert.ok(geminiInput.targetLanguages.includes('qaa_NEW'));
});

test('mismatched targetLanguages fail before Gemini and write no output', async () => {
  const { fetchFn } = mockLokalise({
    alias: 'client',
    languagesByPage: [CLIENT_LANGS],
  });
  let geminiCalls = 0;
  const written = new Map();
  await assert.rejects(
    () =>
      runCli(cliArgs({ project: 'client' }), {
        ...ioFiles({
          ...projectInput,
          targetLanguages: ['en_US', 'zh_CN'],
        }),
        writeFileSync: (path, contents) => written.set(path, contents),
        getApiKey: () => GEMINI_SECRET,
        getLokaliseToken: () => LOKALISE_SECRET,
        fetchFn,
        generateContent: async () => {
          geminiCalls += 1;
          throw new Error('Gemini should not run');
        },
      }),
    (err) => {
      assert.match(err.message, /do not match live Lokalise languages/);
      assert.match(err.message, /qaa_NEW/);
      return true;
    },
  );
  assert.equal(geminiCalls, 0);
  assert.equal(written.size, 0);
  assert.equal(sameLanguageSet(['en_US', 'zh_CN'], CLIENT_LANGS), false);
  assert.equal(sameLanguageSet(['zh_CN', 'en_US'], ['en_US', 'zh_CN']), true);
  assert.equal(sameLanguageSet(['zh_CN'], ['zh-cn']), false);
});

test('Lokalise read failure does not call the model or write output', async () => {
  let geminiCalls = 0;
  const written = new Map();
  await assert.rejects(
    () =>
      runCli(cliArgs({ project: 'client' }), {
        ...ioFiles({ ...projectInput }),
        writeFileSync: (path, contents) => written.set(path, contents),
        getApiKey: () => GEMINI_SECRET,
        getLokaliseToken: () => LOKALISE_SECRET,
        fetchFn: async () => ({
          ok: false,
          status: 401,
          json: async () => ({ error: { message: LOKALISE_SECRET } }),
        }),
        generateContent: async () => {
          geminiCalls += 1;
          throw new Error('Gemini should not run');
        },
      }),
    (err) => {
      assert.match(err.message, /Lokalise/);
      assert.match(err.message, /HTTP 401/);
      assert.equal(err.message.includes(LOKALISE_SECRET), false);
      return true;
    },
  );
  assert.equal(geminiCalls, 0);
  assert.equal(written.size, 0);

  const mismatch = mockLokalise({
    alias: 'client',
    name: 'Wrong Project',
    languagesByPage: [CLIENT_LANGS],
  });
  await assert.rejects(
    () =>
      resolveProjectLanguages({
        alias: 'client',
        token: LOKALISE_SECRET,
        fetchFn: mismatch.fetchFn,
      }),
    /project name mismatch/,
  );
  assert.equal(mismatch.requests.length, 1);
  assert.equal(mismatch.requests[0].url.includes('/languages'), false);
});

test('without --project Lokalise credentials are unused and explicit languages still work', async () => {
  let lokaliseReads = 0;
  let fetchCalls = 0;
  const input = {
    sourceLanguage: 'en',
    targetLanguages: ['zh-CN', 'ja'],
    items: [{ id: 'confirm_action', text: 'Confirm' }],
  };
  const written = new Map();
  const output = await runCli(cliArgs({}), {
    ...ioFiles(input),
    writeFileSync: (path, contents) => written.set(path, contents),
    getApiKey: () => GEMINI_SECRET,
    getLokaliseToken: () => {
      lokaliseReads += 1;
      throw new Error('Lokalise should not be read');
    },
    fetchFn: async () => {
      fetchCalls += 1;
      throw new Error('Lokalise should not be fetched');
    },
    generateContent: async ({ input: payload }) => modelResponse(payload),
  });
  assert.equal(lokaliseReads, 0);
  assert.equal(fetchCalls, 0);
  assert.equal(output.project, undefined);
  assert.deepEqual(output.targetLanguages, ['zh-CN', 'ja']);
  assert.equal(written.size, 1);
});

function cliArgs(overrides = {}) {
  return {
    input: '/tmp/in.json',
    output: '/tmp/out.json',
    model: 'gemini-3.8-flash',
    thinking: 'low',
    project: null,
    ...overrides,
  };
}

function ioFiles(input) {
  const files = new Map();
  files.set('/tmp/in.json', JSON.stringify(input));
  return {
    readFileSync: (path) => files.get(path),
  };
}

function modelResponse(input) {
  const translations = [];
  for (const item of input.items) {
    for (const language of input.targetLanguages) {
      translations.push({ id: item.id, language, text: item.text });
    }
  }
  return {
    text: JSON.stringify({ translations }),
    usageMetadata: {
      promptTokenCount: 1,
      candidatesTokenCount: 1,
      totalTokenCount: 2,
    },
    candidates: [{ finishReason: 'STOP' }],
  };
}

function mockLokalise({ alias, languagesByPage, name, id, baseLanguage } = {}) {
  const spec = PROJECTS[alias];
  const requests = [];
  const fetchFn = async (url, options) => {
    requests.push({ url: String(url), options });
    const parsed = new URL(url);
    const projectPath = `/api2/projects/${spec.id}`;
    if (parsed.pathname === projectPath) {
      return jsonResponse({
        // Match the live REST response, which has no project envelope.
        project_id: id ?? spec.id,
        name: name ?? spec.name,
        base_language_iso:
          baseLanguage ?? (alias === 'server' ? 'en-us' : 'en_US'),
      });
    }
    if (parsed.pathname === `${projectPath}/languages`) {
      const page = Number(parsed.searchParams.get('page') || '1');
      const rows = languagesByPage[page - 1] || [];
      return jsonResponse({
        languages: rows.map((lang_iso) => ({ lang_iso })),
      });
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetchFn, requests };
}

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}
