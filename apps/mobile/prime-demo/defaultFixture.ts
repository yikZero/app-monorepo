import type { IPrimeDemoFixture } from './types';

export const DEFAULT_PRIME_DEMO_FIXTURE: IPrimeDemoFixture = {
  title: 'Permit2',
  origin: 'https://app.uniswap.org',
  accountAddress: '0x13b30304dAa2129a21e42df663e8f49C49b276e8',
  accountLabel: 'Wallet 1 / Account #1',
  networkName: 'Ethereum',
  approveLabel: 'Token approval',
  approveAmount: 'Unlimited',
  approveSymbol: 'USDC',
  outgoing: {
    symbol: 'USDT',
    amount: '0.01',
  },
  incoming: {
    symbol: 'USDC',
    amount: '0.009993',
  },
};
