import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(
  ROOT,
  'features/transaction-security-check/fixture.json',
);
const HTML_PATH = path.join(ROOT, 'dapp/index.html');
const SERVER_PATH = path.join(ROOT, 'scripts/fixture-server.js');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            contentType: String(res.headers['content-type'] || ''),
            body: Buffer.concat(chunks),
          });
        });
      })
      .on('error', reject);
  });
}

function fetchText(url) {
  return fetchBuffer(url).then((result) => ({
    ...result,
    body: result.body.toString('utf8'),
  }));
}

test('canonical fixture is a synthetic PermitSingle high-risk spender demo', () => {
  const fixture = readJson(FIXTURE_PATH);
  assert.equal(fixture.scene, 'transaction-security-check');
  assert.equal(fixture.origin, 'https://rewards.example.com');
  assert.equal(fixture.dapp.url, 'http://localhost:4737/dapp');
  assert.notEqual(fixture.origin, fixture.dapp.url);
  assert.equal(fixture.request.method, 'eth_signTypedData_v4');
  assert.equal(fixture.request.params[1].primaryType, 'PermitSingle');
  assert.equal(fixture.securityResponse.detail.code, 'malicious_approval');
  assert.equal(fixture.metadata.provenance, 'synthetic-demonstration');
  assert.match(fixture.metadata.notes, /synthetic presentation/);
  assert.equal(fixture.securityResponse.detail.features.length, 3);
  assert.equal(
    fixture.securityResponse.detail.features[0].code,
    'high_risk_spender',
  );
  assert.doesNotMatch(
    JSON.stringify(fixture.securityResponse),
    /unlimited_approval/,
  );
  assert.doesNotMatch(fixture.dapp.name, /demo/i);
});

test('local dApp HTML posts the fixture request through the native bridge', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /prime-demo-dapp-prepared/);
  assert.match(html, /__primeDemoTryPrepare/);
  assert.match(html, /prime-demo-dapp-ready/);
  assert.match(html, /prime-demo-ethereum-request/);
  assert.match(html, /ReactNativeWebView\.postMessage/);
  assert.match(html, /window\.ethereum/);
  assert.match(html, /id="claim-button"/);
  assert.match(html, /id="reward-label"/);
  assert.doesNotMatch(html, /uniswap/i);
  assert.doesNotMatch(html, /Rewards Demo/);
  assert.doesNotMatch(html, /https:\/\//);
});

test('fixture server serves the local dApp HTML and fixture JSON', async (t) => {
  const port = 18_000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, [SERVER_PATH], {
    env: {
      ...process.env,
      PRIME_DEMO_FIXTURE_PORT: String(port),
      PRIME_DEMO_FIXTURE_PATH: FIXTURE_PATH,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    child.kill('SIGTERM');
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('fixture server did not start'));
    }, 5000);
    const onData = (chunk) => {
      if (String(chunk).includes('prime-demo fixture server')) {
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code) {
        clearTimeout(timer);
        reject(new Error(`fixture server exited ${code}`));
      }
    });
  });

  const dapp = await fetchText(`http://127.0.0.1:${port}/dapp`);
  assert.equal(dapp.status, 200);
  assert.match(dapp.contentType, /text\/html/);
  assert.match(dapp.body, /claim-button/);

  const fixture = await fetchText(`http://127.0.0.1:${port}/fixture.json`);
  assert.equal(fixture.status, 200);
  const parsed = JSON.parse(fixture.body);
  assert.equal(parsed.scene, 'transaction-security-check');
  assert.deepEqual(parsed, readJson(FIXTURE_PATH));

  const rewards = await fetchBuffer(
    `http://127.0.0.1:${port}/assets/rewards.png`,
  );
  assert.equal(rewards.status, 200);
  assert.match(rewards.contentType, /image\/png/);
  assert.equal(rewards.body.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
});
