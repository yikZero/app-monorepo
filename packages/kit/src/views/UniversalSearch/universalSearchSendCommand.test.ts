import type { IAccountToken, ITokenFiat } from '@onekeyhq/shared/types/token';

import {
  buildUniversalSearchSendCommandTargets,
  findExactContractAddressItem,
  parseUniversalSearchSendCommand,
  resolveUniversalSearchSendCommandTokens,
} from './universalSearchSendCommand';

import type { IAddressNetworkItem } from '../AddressBook/type';

const token = (overrides: Partial<IAccountToken>): IAccountToken =>
  ({
    $key: 'key',
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xusdt',
    decimals: 6,
    isNative: false,
    networkId: 'evm--56',
    ...overrides,
  }) as IAccountToken;

const fiat = (balanceParsed: string, fiatValue: string): ITokenFiat =>
  ({ balance: balanceParsed, balanceParsed, fiatValue }) as ITokenFiat;

const contact = (overrides: Partial<IAddressNetworkItem>) =>
  ({
    name: 'alice',
    address: '0xAeaa000000000000000000000000000000d5db',
    networkId: 'evm--1',
    ...overrides,
  }) as IAddressNetworkItem;

describe('parseUniversalSearchSendCommand', () => {
  it.each([
    ['300usdt to @', { amount: '300', symbol: 'usdt', recipientQuery: '' }],
    [
      '300 USDT to @li',
      { amount: '300', symbol: 'USDT', recipientQuery: 'li' },
    ],
    [
      '0.5 eth to alice',
      { amount: '0.5', symbol: 'eth', recipientQuery: 'alice' },
    ],
    ['300usdt to', { amount: '300', symbol: 'usdt', recipientQuery: '' }],
    [
      '300usdt TO@bob ',
      { amount: '300', symbol: 'usdt', recipientQuery: 'bob' },
    ],
  ])('parses %s', (input, expected) => {
    expect(parseUniversalSearchSendCommand(input)).toEqual(expected);
  });

  it.each([
    '300usdt',
    '300usdt t',
    'usdt to @li',
    '300 to @li',
    '300usdt tom',
    '0 usdt to @li',
    '0x1234abcd to @li',
    'how to send',
  ])('ignores %s', (input) => {
    expect(parseUniversalSearchSendCommand(input)).toBeUndefined();
  });
});

describe('resolveUniversalSearchSendCommandTokens', () => {
  it('matches by symbol across aggregate sub-tokens, richest first', () => {
    const result = resolveUniversalSearchSendCommandTokens({
      symbol: 'usdt',
      tokens: [
        token({ $key: 'agg', isAggregateToken: true, networkId: undefined }),
        token({ $key: 'eth', symbol: 'ETH' }),
      ],
      aggregateTokenListMap: {
        agg: {
          tokens: [
            token({ $key: 'usdt-eth', networkId: 'evm--1' }),
            token({ $key: 'usdt-bsc', networkId: 'evm--56' }),
          ],
        },
      },
      tokenFiatMap: {
        'usdt-eth': fiat('10', '10'),
        'usdt-bsc': fiat('1204', '1204'),
        eth: fiat('1', '3000'),
      },
    });
    expect(result.map((item) => item.token.$key)).toEqual([
      'usdt-bsc',
      'usdt-eth',
    ]);
  });

  it('skips risky, unpriced and empty holdings', () => {
    const result = resolveUniversalSearchSendCommandTokens({
      symbol: 'USDT',
      tokens: [
        token({ $key: 'spam', riskLevel: 1000 }),
        token({ $key: 'unpriced' }),
        token({ $key: 'empty' }),
        token({ $key: 'real' }),
      ],
      tokenFiatMap: {
        spam: fiat('999999', '999999'),
        unpriced: fiat('999999', '0'),
        empty: fiat('0', '0'),
        real: fiat('5', '5'),
      },
    });
    expect(result.map((item) => item.token.$key)).toEqual(['real']);
  });

  it('falls back to the active network for single-network lists', () => {
    const result = resolveUniversalSearchSendCommandTokens({
      symbol: 'usdt',
      tokens: [token({ networkId: undefined })],
      tokenFiatMap: { key: fiat('5', '5') },
      fallbackNetworkId: 'evm--10',
    });
    expect(result[0]?.networkId).toBe('evm--10');
  });
});

describe('buildUniversalSearchSendCommandTargets', () => {
  const tokens = [
    {
      token: token({ $key: 'bsc' }),
      networkId: 'evm--56',
      balance: '1204',
      fiatValue: '1204',
    },
    {
      token: token({ $key: 'eth' }),
      networkId: 'evm--1',
      balance: '10',
      fiatValue: '10',
    },
    {
      token: token({ $key: 'tron' }),
      networkId: 'tron--0x2b6653dc',
      balance: '50',
      fiatValue: '50',
    },
  ];

  it('pairs each matching contact with a holding that covers the amount', () => {
    const targets = buildUniversalSearchSendCommandTargets({
      command: { amount: '300', symbol: 'usdt', recipientQuery: 'ali' },
      contacts: [
        contact({ name: 'bob' }),
        contact({
          name: 'Alice Tron',
          address: 'TXyz',
          networkId: 'tron--0x2b6653dc',
        }),
        contact({ name: 'alice' }),
        contact({ name: 'alice sol', address: 'So1', networkId: 'sol--101' }),
      ],
      tokens,
    });
    expect(
      targets.map((item) => [
        item.contact.name,
        item.source.token.$key,
        item.isInsufficient,
      ]),
    ).toEqual([
      ['alice', 'bsc', false],
      ['Alice Tron', 'tron', true],
    ]);
  });

  it('lists every reachable contact when no recipient is typed yet', () => {
    const targets = buildUniversalSearchSendCommandTargets({
      command: { amount: '1', symbol: 'usdt', recipientQuery: '' },
      contacts: [contact({ name: 'bob' }), contact({ name: 'alice' })],
      tokens,
    });
    expect(targets.map((item) => item.contact.name)).toEqual(['bob', 'alice']);
  });

  it('matches a contact by address', () => {
    const targets = buildUniversalSearchSendCommandTargets({
      command: { amount: '1', symbol: 'usdt', recipientQuery: '0xaeaa' },
      contacts: [contact({})],
      tokens,
    });
    expect(targets).toHaveLength(1);
  });
});

describe('findExactContractAddressItem', () => {
  const items = [
    { payload: { address: '' } },
    { payload: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' } },
    { payload: { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' } },
  ];

  it('matches hex addresses case-insensitively', () => {
    expect(
      findExactContractAddressItem(
        items,
        ' 0xdac17f958d2ee523a2206206994597c13d831ec7 ',
      ),
    ).toBe(items[1]);
  });

  it('matches case-sensitive addresses exactly', () => {
    expect(
      findExactContractAddressItem(
        items,
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      ),
    ).toBe(items[2]);
    expect(
      findExactContractAddressItem(
        items,
        'es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb',
      ),
    ).toBeUndefined();
  });

  it('ignores names, partial addresses and empty input', () => {
    expect(findExactContractAddressItem(items, 'usdt')).toBeUndefined();
    expect(findExactContractAddressItem(items, '')).toBeUndefined();
    expect(
      findExactContractAddressItem(items, '0xdAC17F958D2ee523a2206206994597C1'),
    ).toBeUndefined();
  });
});
