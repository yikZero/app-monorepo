import BigNumber from 'bignumber.js';

import {
  IMPL_ALLNETWORKS,
  IMPL_EVM,
} from '@onekeyhq/shared/src/engine/engineConsts';
import { ETokenRiskLevel } from '@onekeyhq/shared/types/swap/types';
import type { IAccountToken, ITokenFiat } from '@onekeyhq/shared/types/token';

import type { IAddressNetworkItem } from '../AddressBook/type';

export type IUniversalSearchSendCommand = {
  amount: string;
  symbol: string;
  recipientQuery: string;
};

export type IUniversalSearchSendCommandToken = {
  token: IAccountToken;
  networkId: string;
  balance: string;
  fiatValue: string;
};

export type IUniversalSearchSendCommandTarget = {
  contact: IAddressNetworkItem;
  source: IUniversalSearchSendCommandToken;
  isInsufficient: boolean;
};

// "<amount><symbol> to @<recipient>", e.g. "300usdt to @", "0.5 eth to alice".
const SEND_COMMAND_PATTERN =
  /^(\d+(?:\.\d+)?)\s*([a-z]\S*?)\s+to(?:\s+|\s*@|$)(.*)$/i;

const getNetworkImpl = (networkId: string) => networkId.split('--')[0];

export function parseUniversalSearchSendCommand(
  input: string,
): IUniversalSearchSendCommand | undefined {
  const match = SEND_COMMAND_PATTERN.exec(input.trim());
  if (!match) {
    return undefined;
  }
  const [, amount, symbol, recipient] = match;
  // A zero amount also rules out hex addresses such as "0xabc… to".
  if (!new BigNumber(amount).gt(0)) {
    return undefined;
  }
  return {
    amount,
    symbol,
    recipientQuery: recipient.trim().replace(/^@/, '').trim(),
  };
}

/**
 * The account's holdings the command may spend: tokens whose symbol matches,
 * sub-tokens of aggregate tokens included. Risky and unpriced tokens are left
 * out so an airdropped look-alike can never be picked by its symbol alone.
 */
export function resolveUniversalSearchSendCommandTokens({
  symbol,
  tokens,
  tokenFiatMap,
  aggregateTokenListMap,
  fallbackNetworkId,
}: {
  symbol: string;
  tokens: IAccountToken[];
  tokenFiatMap: Record<string, ITokenFiat>;
  aggregateTokenListMap?: Record<string, { tokens: IAccountToken[] }>;
  fallbackNetworkId?: string;
}): IUniversalSearchSendCommandToken[] {
  const targetSymbol = symbol.toLowerCase();
  const seenKeys = new Set<string>();
  const result: IUniversalSearchSendCommandToken[] = [];
  const candidates = tokens.flatMap((token) =>
    token.isAggregateToken
      ? (aggregateTokenListMap?.[token.$key]?.tokens ?? [])
      : [token],
  );
  candidates.forEach((token) => {
    const networkId = token.networkId ?? fallbackNetworkId;
    if (
      !networkId ||
      getNetworkImpl(networkId) === IMPL_ALLNETWORKS ||
      seenKeys.has(token.$key) ||
      token.symbol?.toLowerCase() !== targetSymbol ||
      (token.riskLevel ?? 0) >= ETokenRiskLevel.SPAM
    ) {
      return;
    }
    const fiat = tokenFiatMap[token.$key];
    const balance = new BigNumber(fiat?.balanceParsed ?? 0);
    const fiatValue = new BigNumber(fiat?.fiatValue ?? 0);
    if (!balance.gt(0) || !fiatValue.gt(0)) {
      return;
    }
    seenKeys.add(token.$key);
    result.push({
      token,
      networkId,
      balance: balance.toFixed(),
      fiatValue: fiatValue.toFixed(),
    });
  });
  return result.toSorted((a, b) =>
    new BigNumber(b.fiatValue).comparedTo(a.fiatValue),
  );
}

function isContactOnTokenNetwork(
  contact: IAddressNetworkItem,
  tokenNetworkId: string,
) {
  // An EVM address book entry is valid on every EVM chain.
  if (getNetworkImpl(tokenNetworkId) === IMPL_EVM) {
    return getNetworkImpl(contact.networkId) === IMPL_EVM;
  }
  return contact.networkId === tokenNetworkId;
}

/**
 * One row per address book entry that can receive the token, paired with the
 * holding to spend: the most valuable one that covers the amount, otherwise
 * the most valuable one, marked insufficient.
 */
export function buildUniversalSearchSendCommandTargets({
  command,
  contacts,
  tokens,
}: {
  command: IUniversalSearchSendCommand;
  contacts: IAddressNetworkItem[];
  tokens: IUniversalSearchSendCommandToken[];
}): IUniversalSearchSendCommandTarget[] {
  const query = command.recipientQuery.toLowerCase();
  const targets: IUniversalSearchSendCommandTarget[] = [];
  contacts.forEach((contact) => {
    if (
      query &&
      !contact.name.toLowerCase().includes(query) &&
      !contact.address.toLowerCase().includes(query)
    ) {
      return;
    }
    const sources = tokens.filter((item) =>
      isContactOnTokenNetwork(contact, item.networkId),
    );
    if (!sources.length) {
      return;
    }
    const sufficient = sources.find((item) =>
      new BigNumber(item.balance).gte(command.amount),
    );
    targets.push({
      contact,
      source: sufficient ?? sources[0],
      isInsufficient: !sufficient,
    });
  });
  // Stable sort: spendable rows first, address book order otherwise.
  return targets.toSorted(
    (a, b) => Number(a.isInsufficient) - Number(b.isInsufficient),
  );
}

/**
 * The token search result whose contract address is exactly the searched
 * text, i.e. the user pasted a contract address.
 */
export function findExactContractAddressItem<
  T extends { payload: { address: string } },
>(items: T[], input: string): T | undefined {
  const query = input.trim();
  // Shorter than any contract address; also skips native tokens' empty one.
  if (query.length < 26) {
    return undefined;
  }
  const isHex = /^0x[0-9a-f]+$/i.test(query);
  const normalizedQuery = isHex ? query.toLowerCase() : query;
  return items.find((item) => {
    const address = item.payload.address ?? '';
    return (isHex ? address.toLowerCase() : address) === normalizedQuery;
  });
}
