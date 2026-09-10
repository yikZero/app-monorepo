#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const destDir = path.resolve(
  __dirname,
  '../../../apps/mobile/prime-demo/assets',
);

const ASSETS = [
  {
    file: 'eth.png',
    url: 'https://uni.onekey-asset.com/static/chain/eth.png',
  },
  {
    file: 'usdt.png',
    url: 'https://uni.onekey-asset.com/server-service-indexer/evm--1/tokens/address-0xdac17f958d2ee523a2206206994597c13d831ec7-1722246302921.png',
  },
  {
    file: 'usdc.png',
    url: 'https://uni.onekey-asset.com/server-service-indexer/evm--1/tokens/address-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
  {
    file: 'uniswap.png',
    url: 'https://app.uniswap.org/favicon.png',
  },
];

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 500) {
    throw new Error(`${url} looks too small (${buffer.length} bytes)`);
  }
  fs.writeFileSync(dest, buffer);
  console.log(`wrote ${path.basename(dest)} (${buffer.length} bytes)`);
}

async function main() {
  fs.mkdirSync(destDir, { recursive: true });
  for (const asset of ASSETS) {
    await download(asset.url, path.join(destDir, asset.file));
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
