export type IPrimeAddressRiskCheckEntryPoint =
  | 'inputManual'
  | 'inputRecentList'
  | 'historyList'
  | 'sendAddressInput';

export type IExportHistoryRangeType = 'lastMonth' | 'last3Months' | 'custom';

export type IExportHistoryAccountType = 'indexed' | 'watching' | 'imported';

export type IExportHistoryDownloadEntryPoint = 'taskList' | 'taskDetail';

// Which entitlement let the user run a Prime feature.
export type IPrimeEntitlementSource = 'prime' | 'freeTrial';

export type IPrimeFreeTrialLoginResult = 'success' | 'cancelled' | 'failed';

// Which product surface asked the user to log in to OneKey ID.
export type IOneKeyIdLoginSource =
  | 'primeSubscribe'
  | 'primeDashboardLogin'
  | 'freeTrial'
  | 'gift'
  | 'redeem'
  | 'cloudSync'
  | 'historyExport'
  | 'settings'
  | 'headerButton'
  | 'moreActions'
  | 'referral'
  | 'extExpandTab'
  | 'other';

export type IOneKeyIdLoginDialogResult =
  | 'success'
  | 'cancelled'
  | 'handedOffToExpandTab';

// active: the user tapped an entry with no quota left; auto: a running
// session (e.g. page translation) hit the limit.
export type IPrimeFreeTrialExhaustedTrigger = 'active' | 'auto';
