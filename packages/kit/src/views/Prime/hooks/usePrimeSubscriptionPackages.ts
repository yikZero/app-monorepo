import { useCallback, useMemo, useState } from 'react';

import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';
import type { IOneKeyError } from '@onekeyhq/shared/src/errors/types/errorTypes';
import errorToastUtils from '@onekeyhq/shared/src/errors/utils/errorToastUtils';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  isPrimeAppleStorePayment,
  isPrimeCryptoPaymentSupported,
  isPrimeStorePayment,
} from '@onekeyhq/shared/src/prime/primePaymentCapabilities';
import { getPrimePurchaseErrorAnalytics } from '@onekeyhq/shared/src/utils/primePurchaseErrorAnalytics';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';

import { shouldShowPrimeChinaStorefrontHint } from './primeChinaStorefront';
import {
  getPrimePackagesFailureKind,
  getPrimeStorefrontCountryCode,
  isPrimeTransientPackagesFailure,
} from './primePackagesFetchFailure';
import { getPrimeSimulatedPackagesFault } from './primePackagesFetchFault';
import { usePrimePayment } from './usePrimePayment';
import { usePrimePaymentMethodsWeb } from './usePrimePaymentMethodsWeb';

import type { IPrimePackagesFetchFailure } from './primePackagesFetchFailure';
import type { IPackage } from './usePrimePaymentTypes';

const EMPTY_OFFERING_MESSAGE = 'Prime subscription packages unavailable';
const TRANSIENT_RETRY_DELAY_MS = 1000;

export type IPrimePackagesFailureState = IPrimePackagesFetchFailure & {
  isChinaStorefront: boolean;
};

export function usePrimeSubscriptionPackages({
  enabled,
}: {
  enabled: boolean;
}) {
  const {
    isReady: isPurchaseReady,
    initializationError,
    getPackagesNative,
    getStorefront,
    restorePurchases,
    getPackagesWeb,
  } = usePrimePayment();
  const { getPackagesWeb: getPackagesWebFallback } =
    usePrimePaymentMethodsWeb();
  const [failure, setFailure] = useState<
    IPrimePackagesFailureState | undefined
  >();

  const { result: webPackages, run: reloadWebPackages } = usePromiseResult(
    async () => {
      // Card prices are only a fallback where card checkout is offered (APK).
      // Play builds are store-only and must not show prices they cannot sell.
      if (
        !enabled ||
        !isPurchaseReady ||
        !platformEnv.isNativeAndroid ||
        !isPrimeCryptoPaymentSupported()
      ) {
        return [];
      }

      const pkgList = await getPackagesWebFallback?.();
      return pkgList ?? [];
    },
    [enabled, getPackagesWebFallback, isPurchaseReady],
    {
      initResult: [],
    },
  );

  const {
    result: sdkPackages,
    isLoading: isPackagesLoading,
    run: reloadSdkPackages,
  } = usePromiseResult(
    async () => {
      if (!enabled || !isPurchaseReady) {
        return [];
      }

      return errorToastUtils.withErrorAutoToast(async () => {
        const loadOnce = async () => {
          const simulatedFault = await getPrimeSimulatedPackagesFault();
          if (simulatedFault?.type === 'error') {
            throw simulatedFault.error;
          }
          const pkgList =
            simulatedFault?.type === 'emptyOffering'
              ? []
              : await (isPrimeStorePayment()
                  ? getPackagesNative?.()
                  : getPackagesWeb?.());
          // An empty list blocks purchase as much as an error does.
          if (!pkgList?.length) {
            throw new OneKeyLocalError(EMPTY_OFFERING_MESSAGE);
          }
          return pkgList;
        };
        try {
          let pkgList: IPackage[];
          try {
            pkgList = await loadOnce();
          } catch (firstError) {
            // Play Billing documents SERVICE_UNAVAILABLE, SERVICE_DISCONNECTED
            // and NETWORK_ERROR as transient and asks apps to retry them;
            // RevenueCat maps those to codes 2 and 10. Retry once silently.
            if (
              firstError === initializationError ||
              !isPrimeTransientPackagesFailure(
                getPrimePackagesFailureKind(
                  getPrimePurchaseErrorAnalytics(firstError),
                ),
              )
            ) {
              throw firstError;
            }
            await timerUtils.wait(TRANSIENT_RETRY_DELAY_MS);
            pkgList = await loadOnce();
          }
          setFailure(undefined);
          return pkgList;
        } catch (error) {
          const e = error as IOneKeyError | undefined;
          const isInitializationError = Boolean(
            initializationError && error === initializationError,
          );
          const errorAnalytics = getPrimePurchaseErrorAnalytics(error);
          const failureKind = getPrimePackagesFailureKind({
            ...errorAnalytics,
            isEmptyOffering: e?.message === EMPTY_OFFERING_MESSAGE,
          });
          // Initialization failures need a newer native shell, not Storefront.
          const storefrontCountryCode = isInitializationError
            ? undefined
            : await getPrimeStorefrontCountryCode(getStorefront);

          defaultLogger.prime.subscription.fetchPackagesFailed({
            errorMessage: e?.message || 'Unknown error',
            ...errorAnalytics,
            failureKind,
            storefrontCountryCode,
          });

          if (isInitializationError) {
            // Keep the actionable update message outside the fail state.
            throw error;
          }

          const isChinaStorefront =
            isPrimeAppleStorePayment() &&
            (await shouldShowPrimeChinaStorefrontHint(error, async () =>
              storefrontCountryCode
                ? { countryCode: storefrontCountryCode }
                : null,
            ));
          setFailure({
            kind: failureKind,
            storefrontCountryCode,
            isChinaStorefront,
          });
          return [];
        }
      });
    },
    [
      enabled,
      getPackagesNative,
      getPackagesWeb,
      getStorefront,
      isPurchaseReady,
      initializationError,
    ],
    {
      initResult: [],
      watchLoading: true,
    },
  );

  const packages = useMemo(() => {
    if (sdkPackages?.length) {
      return sdkPackages;
    }
    return webPackages || [];
  }, [sdkPackages, webPackages]);

  // Android APKs fall back to card prices; only an empty list blocks purchase.
  const packagesFailure =
    enabled && !isPackagesLoading && !packages.length ? failure : undefined;

  const reloadPackages = useCallback(async () => {
    await Promise.all([reloadSdkPackages(), reloadWebPackages()]);
  }, [reloadSdkPackages, reloadWebPackages]);

  return {
    packages,
    isPackagesLoading,
    isPurchaseReady,
    restorePurchases,
    packagesFailure,
    reloadPackages,
  };
}
