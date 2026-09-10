#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PRIME_DEMO_FIXTURE_PORT || 4737);
const DEFAULT_FIXTURE_PATH = path.join(
  __dirname,
  '../fixtures/permit2-uniswap.json',
);
const fixturePath = process.env.PRIME_DEMO_FIXTURE_PATH
  ? path.resolve(process.env.PRIME_DEMO_FIXTURE_PATH)
  : DEFAULT_FIXTURE_PATH;

if (!fs.existsSync(fixturePath)) {
  console.error(`Fixture not found: ${fixturePath}`);
  process.exit(1);
}
const assetsDir = path.resolve(
  __dirname,
  '../../../apps/mobile/prime-demo/assets',
);
const ASSET_FILES = new Set([
  'eth.png',
  'usdt.png',
  'usdc.png',
  'uniswap.png',
  'rewards.png',
]);
const dappIndexPath = path.resolve(__dirname, '../dapp/index.html');

function isDappPath(pathname) {
  return (
    pathname === '/dapp' ||
    pathname === '/dapp/' ||
    pathname === '/dapp/index.html'
  );
}

let pendingCommand = null;
let markers = [];
const startedHrMs = Number(process.hrtime.bigint() / 1_000_000n);

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function resetState() {
  pendingCommand = null;
  markers = [];
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  void (async () => {
    if (url.pathname === '/health' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, markerCount: markers.length });
      return;
    }

    const assetMatch = url.pathname.match(/^\/assets\/([a-z0-9-]+\.png)$/i);
    if (assetMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      const fileName = assetMatch[1];
      if (!ASSET_FILES.has(fileName)) {
        sendJson(res, 404, { error: `unknown asset ${fileName}` });
        return;
      }
      const filePath = path.join(assetsDir, fileName);
      const body = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': String(body.length),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(body);
      return;
    }

    if (
      isDappPath(url.pathname) &&
      (req.method === 'GET' || req.method === 'HEAD')
    ) {
      if (!fs.existsSync(dappIndexPath)) {
        sendJson(res, 404, { error: 'dapp html not found' });
        return;
      }
      const body = fs.readFileSync(dappIndexPath);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': String(body.length),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(body);
      return;
    }

    if (url.pathname === '/fixture.json' && req.method === 'GET') {
      const json = fs.readFileSync(fixturePath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      res.end(json);
      return;
    }

    if (url.pathname === '/command' && req.method === 'GET') {
      const command = pendingCommand;
      pendingCommand = null;
      sendJson(res, 200, command || {});
      return;
    }

    if (url.pathname === '/command' && req.method === 'POST') {
      pendingCommand = await readBody(req);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/markers' && req.method === 'GET') {
      sendJson(res, 200, { markers });
      return;
    }

    if (url.pathname === '/markers' && req.method === 'POST') {
      const payload = await readBody(req);
      markers.push({
        ...payload,
        receivedAtMs: Date.now(),
        receivedHrMs:
          Number(process.hrtime.bigint() / 1_000_000n) - startedHrMs,
      });
      sendJson(res, 200, { ok: true, count: markers.length });
      return;
    }

    if (
      (url.pathname === '/markers' && req.method === 'DELETE') ||
      (url.pathname === '/markers/clear' && req.method === 'POST')
    ) {
      markers = [];
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/reset' && req.method === 'POST') {
      resetState();
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: 'not found' });
  })().catch((error) => {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : 'error',
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `prime-demo fixture server http://localhost:${PORT}/fixture.json file=${fixturePath}`,
  );
});
