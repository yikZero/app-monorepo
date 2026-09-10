import { PRIME_DEMO_LOCAL_ORIGIN } from './demoFetch';

// Distinct localhost paths served by the fixture server (image/png, no-store).
// Keep HTTP Image URIs so the demo does not depend on Metro asset query URLs.
// A pink "U" on older native builds is RCTUnimplementedViewComponentView, not
// an image-cache mixup of these files.
const ASSET_QUERY = 'v=fixture-server';

export const PRIME_DEMO_ASSET_URIS = {
  usdt: `${PRIME_DEMO_LOCAL_ORIGIN}/assets/usdt.png?${ASSET_QUERY}`,
  usdc: `${PRIME_DEMO_LOCAL_ORIGIN}/assets/usdc.png?${ASSET_QUERY}`,
  eth: `${PRIME_DEMO_LOCAL_ORIGIN}/assets/eth.png?${ASSET_QUERY}`,
  uniswap: `${PRIME_DEMO_LOCAL_ORIGIN}/assets/uniswap.png?${ASSET_QUERY}`,
  rewards: `${PRIME_DEMO_LOCAL_ORIGIN}/assets/rewards.png?${ASSET_QUERY}`,
};

export function getPrimeDemoTokenIconUri(symbol: string) {
  const key = symbol.toUpperCase();
  if (key === 'USDT') {
    return PRIME_DEMO_ASSET_URIS.usdt;
  }
  if (key === 'USDC') {
    return PRIME_DEMO_ASSET_URIS.usdc;
  }
  return PRIME_DEMO_ASSET_URIS.eth;
}
