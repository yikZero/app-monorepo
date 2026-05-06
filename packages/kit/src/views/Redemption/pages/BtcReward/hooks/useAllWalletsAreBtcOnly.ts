import { useCallback } from 'react';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';

export function useAllWalletsAreBtcOnly(): boolean {
  const fetcher = useCallback(async () => {
    const { wallets } =
      await backgroundApiProxy.serviceAccount.getAllHdHwQrWallets();
    if (wallets.length === 0) {
      return false;
    }
    const checks = await Promise.all(
      wallets.map((w) =>
        backgroundApiProxy.serviceAccount.isBtcOnlyFirmwareByWalletId({
          walletId: w.id,
        }),
      ),
    );
    return checks.every(Boolean);
  }, []);

  const { result } = usePromiseResult(fetcher, [fetcher]);
  return result === true;
}
