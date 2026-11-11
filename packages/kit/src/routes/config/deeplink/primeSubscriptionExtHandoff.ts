import {
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_CURRENCY_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_ENTRY_POINT_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_FALLBACK_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_FEATURE_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_PAYWALL_SESSION_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_PURCHASE_FLOW_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_STARTED_AT_QUERY,
  PRIME_SUBSCRIPTION_EXT_HANDOFF_QUERY,
  PRIME_SUBSCRIPTION_EXT_HANDOFF_VALUE,
} from '@onekeyhq/shared/src/consts/deeplinkConsts';
import { EPrimeFeatures } from '@onekeyhq/shared/src/routes/prime';
import type {
  IPrimeEntryPoint,
  IPrimePurchaseAnalyticsContext,
} from '@onekeyhq/shared/types/prime/primeAnalytics';

import {
  getExtExpandTabHashParams,
  stripExtExpandTabHashParams,
} from '../../../utils/extExpandTabHashParams';

import type { ISubscriptionPeriod } from '../../../views/Prime/hooks/usePrimePaymentTypes';
import type { IPrimeEmbeddedCheckoutFallbackTrigger } from '../../../views/Prime/purchasesSdk/primeEmbeddedCheckoutFallback';

export function consumePrimeSubscriptionHandoffFromUrl(): boolean {
  if (
    getExtExpandTabHashParams()?.get(PRIME_SUBSCRIPTION_EXT_HANDOFF_QUERY) !==
    PRIME_SUBSCRIPTION_EXT_HANDOFF_VALUE
  ) {
    return false;
  }
  stripExtExpandTabHashParams([PRIME_SUBSCRIPTION_EXT_HANDOFF_QUERY]);
  return true;
}

const PRIME_SUBSCRIPTION_PERIODS: readonly ISubscriptionPeriod[] = [
  'P1Y',
  'P1M',
];
const PRIME_FEATURES = new Set<string>(Object.values(EPrimeFeatures));
const PRIME_CARD_CHECKOUT_FALLBACK_TRIGGERS: readonly IPrimeEmbeddedCheckoutFallbackTrigger[] =
  ['checkoutError', 'formNotLoaded', 'userRequestedHostedCheckout'];
const CURRENCY_CODE_REGEX = /^[A-Za-z]{3}$/;
const PRIME_ENTRY_POINTS = new Set<IPrimeEntryPoint>([
  'settingsPage',
  'moreActions',
  'approvalPopup',
  'primePage',
  'walletEdit',
  'accountSelectorAddMenu',
  'browserTranslate',
  'historySettings',
  'sendAddressInput',
  'signatureConfirm',
  'approvalBulkRevoke',
  'settingsPrimeRow',
  'headerPrimeIcon',
  'oneKeyIdPage',
  'deepLink',
  'giftClaimSuccess',
  'freeTrialExhaustedToast',
  'deviceLimitPage',
  'notification',
]);
const ANALYTICS_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type IPrimeCardCheckoutHandoff = {
  selectedSubscriptionPeriod: ISubscriptionPeriod;
  featureName?: EPrimeFeatures;
  currency?: string;
  analyticsContext?: IPrimePurchaseAnalyticsContext;
  // Set when the popup failed or the user explicitly switched checkout.
  fallbackFrom?: IPrimeEmbeddedCheckoutFallbackTrigger;
};

// Card checkout started in the popup continues in the expand tab, which
// survives the hosted checkout tab taking focus.
export function consumePrimeCardCheckoutHandoffFromUrl():
  | IPrimeCardCheckoutHandoff
  | undefined {
  const params = getExtExpandTabHashParams();
  const period = params?.get(PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY);
  if (!params || !period) {
    return undefined;
  }
  const feature = params.get(PRIME_CARD_CHECKOUT_EXT_HANDOFF_FEATURE_QUERY);
  const currency = params.get(PRIME_CARD_CHECKOUT_EXT_HANDOFF_CURRENCY_QUERY);
  const fallback = params.get(PRIME_CARD_CHECKOUT_EXT_HANDOFF_FALLBACK_QUERY);
  const paywallSessionId = params.get(
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_PAYWALL_SESSION_QUERY,
  );
  const purchaseFlowId = params.get(
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_PURCHASE_FLOW_QUERY,
  );
  const entryPoint = params.get(
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_ENTRY_POINT_QUERY,
  );
  const purchaseStartedAt = Number(
    params.get(PRIME_CARD_CHECKOUT_EXT_HANDOFF_STARTED_AT_QUERY),
  );
  stripExtExpandTabHashParams([
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY,
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_FEATURE_QUERY,
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_CURRENCY_QUERY,
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_FALLBACK_QUERY,
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_PAYWALL_SESSION_QUERY,
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_PURCHASE_FLOW_QUERY,
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_ENTRY_POINT_QUERY,
    PRIME_CARD_CHECKOUT_EXT_HANDOFF_STARTED_AT_QUERY,
  ]);
  const selectedSubscriptionPeriod = PRIME_SUBSCRIPTION_PERIODS.find(
    (item) => item === period,
  );
  if (!selectedSubscriptionPeriod) {
    return undefined;
  }
  const analyticsContext: IPrimePurchaseAnalyticsContext = {
    ...(paywallSessionId && ANALYTICS_UUID_REGEX.test(paywallSessionId)
      ? { paywallSessionId }
      : {}),
    ...(purchaseFlowId && ANALYTICS_UUID_REGEX.test(purchaseFlowId)
      ? { purchaseFlowId }
      : {}),
    ...(entryPoint && PRIME_ENTRY_POINTS.has(entryPoint as IPrimeEntryPoint)
      ? { entryPoint: entryPoint as IPrimeEntryPoint }
      : {}),
    ...(Number.isFinite(purchaseStartedAt) && purchaseStartedAt > 0
      ? { purchaseStartedAt }
      : {}),
  };
  return {
    selectedSubscriptionPeriod,
    featureName:
      feature && PRIME_FEATURES.has(feature)
        ? (feature as EPrimeFeatures)
        : undefined,
    currency:
      currency && CURRENCY_CODE_REGEX.test(currency) ? currency : undefined,
    fallbackFrom: PRIME_CARD_CHECKOUT_FALLBACK_TRIGGERS.find(
      (item) => item === fallback,
    ),
    ...(Object.keys(analyticsContext).length > 0 ? { analyticsContext } : {}),
  };
}
