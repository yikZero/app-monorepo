import { useCallback } from 'react';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { useActiveAccount } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EModalSignAndVerifyRoutes } from '@onekeyhq/shared/src/routes/signAndVerify';

/**
 * Whether the active account can sign messages, and an opener for the sign &
 * verify page. Pass `enabled: false` to skip the availability query.
 */
export function useSignAndVerify({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const navigation = useAppNavigation();
  const { activeAccount } = useActiveAccount({ num: 0 });

  const {
    network,
    account,
    wallet,
    indexedAccount,
    deriveInfoItems,
    deriveType,
    isOthersWallet,
  } = activeAccount;

  const { result: isAvailable } = usePromiseResult(async () => {
    if (!enabled) {
      return false;
    }
    const signAccounts =
      await backgroundApiProxy.serviceInternalSignAndVerify.getSignAccounts({
        networkId: network?.id ?? '',
        accountId: account?.id ?? '',
        indexedAccountId: indexedAccount?.id ?? '',
        isOthersWallet,
      });
    return signAccounts.length > 0;
  }, [enabled, account?.id, indexedAccount?.id, isOthersWallet, network?.id]);

  const open = useCallback(() => {
    if (!network?.id || !wallet?.id) {
      return false;
    }
    navigation.pushModal(EModalRoutes.SignAndVerifyModal, {
      screen: EModalSignAndVerifyRoutes.SignAndVerifyMessage,
      params: {
        networkId: network.id,
        accountId: account?.id,
        walletId: wallet.id,
        indexedAccountId: indexedAccount?.id,
        deriveInfoItems,
        deriveType,
        isOthersWallet,
      },
    });
    return true;
  }, [
    navigation,
    account,
    deriveInfoItems,
    deriveType,
    indexedAccount,
    isOthersWallet,
    network,
    wallet,
  ]);

  return { isAvailable: Boolean(isAvailable), open };
}
