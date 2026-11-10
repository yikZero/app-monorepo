import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIntl } from 'react-intl';

import {
  Empty,
  NumberSizeableText,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { NetworkAvatar } from '@onekeyhq/kit/src/components/NetworkAvatar';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import type { IHomeTokenListSnapshot } from '@onekeyhq/kit/src/states/jotai/contexts/tokenList/cells/useHomeTokenListSnapshot';
import { ETranslations } from '@onekeyhq/shared/src/locale/enum/translations';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  EModalRoutes,
  EModalSignatureConfirmRoutes,
} from '@onekeyhq/shared/src/routes';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';

import { useAddressBookItems } from '../../AddressBook/hooks/useAddressBook';
import { UniversalSearchTestIDs } from '../testIDs';
import {
  buildUniversalSearchSendCommandTargets,
  resolveUniversalSearchSendCommandTokens,
} from '../universalSearchSendCommand';

import type { IAddressNetworkItem } from '../../AddressBook/type';
import type {
  IUniversalSearchSendCommand,
  IUniversalSearchSendCommandTarget,
} from '../universalSearchSendCommand';

const EMPTY_CONTACTS: IAddressNetworkItem[] = [];

type ISendCommandAccount = {
  accountId?: string;
  networkId?: string;
  indexedAccountId?: string;
  isAllNetworks?: boolean;
};

/**
 * Results of a "<amount><symbol> to @<recipient>" search: the address book
 * entries that can receive the token. Picking one opens the regular send
 * flow with token, recipient and amount filled in, so every send check and
 * the confirmation step still apply.
 */
export function UniversalSearchSendCommand({
  command,
  account,
  tokenList,
}: {
  command: IUniversalSearchSendCommand;
  account: ISendCommandAccount;
  tokenList: IHomeTokenListSnapshot;
}) {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const { accountId, networkId, indexedAccountId, isAllNetworks } = account;
  const isWatchOnly = accountId
    ? accountUtils.isWatchingAccount({ accountId })
    : false;
  // The home list snapshot lags account switches; only trust a matching one.
  const isTokenListReady =
    Boolean(accountId) &&
    tokenList.accountId === accountId &&
    tokenList.networkId === networkId;

  const { result: aggregateTokenListMap } = usePromiseResult(
    async () =>
      accountId && networkId
        ? backgroundApiProxy.serviceToken.getLocalAggregateTokenListMap({
            accountId,
            networkId,
          })
        : undefined,
    [accountId, networkId],
  );
  const { result: addressBook } = useAddressBookItems();
  const contacts = addressBook?.items ?? EMPTY_CONTACTS;

  const tokens = useMemo(
    () =>
      isTokenListReady && !isWatchOnly
        ? resolveUniversalSearchSendCommandTokens({
            symbol: command.symbol,
            tokens: tokenList.tokens,
            tokenFiatMap: tokenList.map,
            aggregateTokenListMap,
            fallbackNetworkId: networkId,
          })
        : [],
    [
      aggregateTokenListMap,
      command.symbol,
      isTokenListReady,
      isWatchOnly,
      networkId,
      tokenList.map,
      tokenList.tokens,
    ],
  );
  const targets = useMemo(
    () => buildUniversalSearchSendCommandTargets({ command, contacts, tokens }),
    [command, contacts, tokens],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    setSelectedIndex(0);
  }, [targets]);

  const isOpeningRef = useRef(false);
  const handleSelect = useCallback(
    async (target: IUniversalSearchSendCommandTarget) => {
      if (target.isInsufficient || isOpeningRef.current || !accountId) {
        return;
      }
      isOpeningRef.current = true;
      try {
        const { token, networkId: tokenNetworkId } = target.source;
        let sendAccountId = token.accountId;
        // Merged-derive assets (e.g. BTC in All networks) carry no account;
        // send from the default derive type, like the wallet's Send entry.
        if (!sendAccountId && isAllNetworks && indexedAccountId) {
          const deriveType =
            await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork(
              { networkId: tokenNetworkId },
            );
          const { accounts } =
            await backgroundApiProxy.serviceAccount.getAccountsByIndexedAccounts(
              {
                indexedAccountIds: [indexedAccountId],
                networkId: tokenNetworkId,
                deriveType,
              },
            );
          sendAccountId = accounts?.[0]?.id;
        }
        navigation.pop();
        // Wait for the search modal to finish closing.
        await timerUtils.wait(300);
        navigation.pushModal(EModalRoutes.SignatureConfirmModal, {
          screen: EModalSignatureConfirmRoutes.TxDataInput,
          params: {
            accountId: sendAccountId ?? accountId,
            networkId: tokenNetworkId,
            isNFT: false,
            token,
            address: target.contact.address,
            amount: command.amount,
            isAllNetworks,
          },
        });
      } finally {
        isOpeningRef.current = false;
      }
    },
    [accountId, command.amount, indexedAccountId, isAllNetworks, navigation],
  );

  // Desktop and web: arrow keys move the selection, Enter opens it. The
  // search field keeps focus, so the keys are caught on the way down.
  const keyboardStateRef = useRef({ targets, selectedIndex, handleSelect });
  keyboardStateRef.current = { targets, selectedIndex, handleSelect };
  useEffect(() => {
    if (platformEnv.isNative) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const state = keyboardStateRef.current;
      if (!state.targets.length || event.isComposing) {
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setSelectedIndex(
          (prev) => (prev + step + state.targets.length) % state.targets.length,
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const target = state.targets[state.selectedIndex];
        if (target) {
          void state.handleSelect(target);
        }
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown, true);
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const displaySymbol = tokens[0]?.token.symbol ?? command.symbol.toUpperCase();
  const header = (
    <XStack px="$5" h="$9" ai="center" jc="space-between" gap="$3">
      <SizableText size="$headingSm" numberOfLines={1} flexShrink={1}>
        {`${intl.formatMessage({ id: ETranslations.global_send })} ${
          command.amount
        } ${displaySymbol}`}
      </SizableText>
      {!platformEnv.isNative && targets.length ? (
        <SizableText size="$bodySm" color="$textSubdued" flexShrink={0}>
          ↑↓ ⏎
        </SizableText>
      ) : null}
    </XStack>
  );

  let emptyTitle: string | undefined;
  if (isWatchOnly) {
    emptyTitle = intl.formatMessage({
      id: ETranslations.global_watch_only_wallet,
    });
  } else if (isTokenListReady && !tokens.length) {
    emptyTitle = intl.formatMessage({
      id: ETranslations.dexmarket_insufficient_balance,
    });
  } else if (isTokenListReady && addressBook && !contacts.length) {
    emptyTitle = intl.formatMessage({
      id: ETranslations.address_book_no_results_title_migration,
    });
  } else if (isTokenListReady && addressBook && !targets.length) {
    emptyTitle = intl.formatMessage({ id: ETranslations.global_no_results });
  }

  return (
    <YStack flex={1}>
      {header}
      {emptyTitle ? (
        <Empty illustration="QuestionMark" title={emptyTitle} />
      ) : (
        <ScrollView flex={1} keyboardShouldPersistTaps="handled">
          <XStack px="$5" h="$8" ai="center">
            <SizableText size="$bodySm" color="$textSubdued">
              {intl.formatMessage({ id: ETranslations.address_book_title })}
            </SizableText>
          </XStack>
          {targets.map((target, index) => {
            const { contact, source, isInsufficient } = target;
            return (
              <ListItem
                key={`${contact.id ?? contact.address}-${contact.networkId}`}
                testID={UniversalSearchTestIDs.sendCommandItem}
                userSelect="none"
                bg={index === selectedIndex ? '$bgActive' : undefined}
                opacity={isInsufficient ? 0.5 : 1}
                disabled={isInsufficient}
                onPress={() => handleSelect(target)}
                renderAvatar={
                  <NetworkAvatar networkId={source.networkId} size="$10" />
                }
                title={contact.name}
                subtitle={accountUtils.shortenAddress({
                  address: contact.address,
                })}
              >
                <YStack ai="flex-end" flexShrink={0}>
                  <NumberSizeableText
                    size="$bodyMdMedium"
                    formatter="balance"
                    formatterOptions={{ tokenSymbol: source.token.symbol }}
                  >
                    {source.balance}
                  </NumberSizeableText>
                  {isInsufficient ? (
                    <SizableText size="$bodySm" color="$textCritical">
                      {intl.formatMessage({
                        id: ETranslations.dexmarket_insufficient_balance,
                      })}
                    </SizableText>
                  ) : null}
                </YStack>
              </ListItem>
            );
          })}
        </ScrollView>
      )}
    </YStack>
  );
}
