export type IPrimeEntryPoint =
  | 'settingsPage'
  | 'moreActions'
  | 'approvalPopup'
  | 'primePage'
  | 'walletEdit'
  | 'accountSelectorAddMenu'
  | 'browserTranslate'
  | 'historySettings'
  | 'sendAddressInput'
  | 'signatureConfirm'
  | 'approvalBulkRevoke'
  | 'settingsPrimeRow'
  | 'headerPrimeIcon'
  | 'oneKeyIdPage'
  | 'deepLink'
  | 'giftClaimSuccess'
  | 'freeTrialExhaustedToast'
  | 'deviceLimitPage'
  | 'notification';

// Optional for previously persisted sessions and non-paywall SDK callers.
export type IPrimePurchaseAnalyticsContext = {
  paywallSessionId?: string;
  purchaseFlowId?: string;
  entryPoint?: IPrimeEntryPoint;
  purchaseStartedAt?: number;
};

export type IPrimePurchaseStore =
  | 'appStore'
  | 'playStore'
  | 'desktopStore'
  | 'rcBilling'
  | 'infini'
  | 'promotional';

export type IPrimePeriodType = 'trial' | 'intro' | 'normal';
