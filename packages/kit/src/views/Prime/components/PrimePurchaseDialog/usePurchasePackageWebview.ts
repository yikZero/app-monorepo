import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import { useOneKeyAuth } from '@onekeyhq/kit/src/components/OneKeyAuth/useOneKeyAuth';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { EWebEmbedRoutePath } from '@onekeyhq/shared/src/consts/webEmbedConsts';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import type { EPrimeFeatures } from '@onekeyhq/shared/src/routes/prime';
import openUrlUtils from '@onekeyhq/shared/src/utils/openUrlUtils';
import type { IPrimePurchaseAnalyticsContext } from '@onekeyhq/shared/types/prime/primeAnalytics';

import { getPrimePaymentApiKey } from '../../hooks/getPrimePaymentApiKey';
import { retirePrimeWebCheckout } from '../../hooks/retirePrimeWebCheckout';

import type { ISubscriptionPeriod } from '../../hooks/usePrimePaymentTypes';

export function usePurchasePackageWebview() {
  const navigation = useAppNavigation();
  const { user, supabaseUser } = useOneKeyAuth();
  const intl = useIntl();

  const purchasePackageWebview = useCallback(
    async ({
      selectedSubscriptionPeriod,
      currency,
      featureName,
      analyticsContext,
    }: {
      selectedSubscriptionPeriod: ISubscriptionPeriod | undefined;
      currency?: string;
      featureName?: EPrimeFeatures;
      analyticsContext?: IPrimePurchaseAnalyticsContext;
    }) => {
      if (!selectedSubscriptionPeriod) {
        return;
      }
      const { apiKey, isSandboxKey } = await getPrimePaymentApiKey({
        apiKeyType: 'web',
      });
      // A click is always a new payment; an earlier hosted checkout neither
      // gates nor resumes it. See retirePrimeWebCheckout.
      await retirePrimeWebCheckout(user?.onekeyUserId);
      navigation.popStack();

      openUrlUtils.openUrlByWebviewPro({
        url: '',
        title: 'WebView',
        isWebEmbed: true,
        hashRoutePath: EWebEmbedRoutePath.primePurchase,
        hashRouteQueryParams: {
          primeUserId: user?.onekeyUserId || '',
          primeUserEmail: supabaseUser?.email || '',
          subscriptionPeriod: selectedSubscriptionPeriod,
          locale: intl.locale,
          mode: platformEnv.isDev ? 'dev' : 'prod',
          apiKey: apiKey || '',
          isSandboxKey: isSandboxKey ? '1' : '0',
          ...(analyticsContext?.paywallSessionId
            ? { paywallSessionId: analyticsContext.paywallSessionId }
            : {}),
          ...(analyticsContext?.purchaseFlowId
            ? { purchaseFlowId: analyticsContext.purchaseFlowId }
            : {}),
          ...(analyticsContext?.entryPoint
            ? { entryPoint: analyticsContext.entryPoint }
            : {}),
          ...(analyticsContext?.purchaseStartedAt
            ? {
                purchaseStartedAt: String(analyticsContext.purchaseStartedAt),
              }
            : {}),
          ...(currency ? { currency } : {}),
          ...(featureName ? { featureName } : {}),
        },
      });
    },
    [navigation, user?.onekeyUserId, supabaseUser?.email, intl.locale],
  );

  return purchasePackageWebview;
}
