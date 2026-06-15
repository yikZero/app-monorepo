/**
 * Temporary hardcoded English copy for the Address Risk Check feature.
 *
 * TODO(i18n): these strings have no Lokalise keys yet. Product will supplement
 * the translation keys later; once they land, replace each usage with the
 * generated `ETranslations` member and delete the corresponding entry here.
 * Existing reusable strings already use `ETranslations.*` directly in the code.
 */
import { EKytRiskLevel } from '@onekeyhq/shared/types/kyt';

export const ARC_TEXTS = {
  title: 'Address risk check',
  intro:
    'Check whether a wallet address is linked to high-risk entities before sending or receiving funds.',
  selectNetwork: 'Select network',
  enterAddress: 'Enter address',
  checkRisk: 'Check risk',
  invalidAddress: 'Invalid address',
  recentChecks: 'Recent checks',
  historyTitle: 'Risk check history',
  historyEmptyTitle: 'No checks yet',
  historyEmptyDescription:
    'Addresses you check will appear here, saved only on this device.',
  clearHistoryTitle: 'Clear all history?',
  clearHistoryDescription:
    'This removes all locally saved address risk checks from this device.',
  lastChecked: 'Last checked',
  moreAnalysis: 'More address analysis',
  exposureShare: 'Exposure / Share',
  // Address activity
  addressActivity: 'Address activity',
  firstActive: 'First active',
  lastActive: 'Last active',
  receivedSent: 'Received / Sent',
  received: 'Received',
  sent: 'Sent',
  txsLabel: (count: number | string) => `${count} txs`,
  // Platform profile
  platformProfile: 'Platform profile',
  exchangesLabel: (count: number | string) => `${count} exchanges`,
  noPlatformSignals: 'No DEX, mixer, or NFT signals',
  // Risk intelligence
  riskIntelligence: 'Risk intelligence',
  signalsLabel: (count: number | string) => `${count} signals`,
  riskIntelligenceCategory: {
    phishing: 'Phishing',
    ransom: 'Ransom',
    theft: 'Theft',
    laundering: 'Laundering',
  } as Record<string, string>,
  // Address-context result heading (figure 5/6 wording). Typed as a full
  // `Record<EKytRiskLevel, string>` via `satisfies` so that adding a new level
  // (or the non-terminal `Checking`/`Failed` states) fails at compile time
  // instead of silently rendering an empty title at runtime.
  levelHeading: {
    [EKytRiskLevel.Checking]: 'Checking address risk',
    [EKytRiskLevel.None]: 'No significant risk detected',
    [EKytRiskLevel.Low]: 'Low risk detected',
    [EKytRiskLevel.Moderate]: 'Moderate risk detected',
    [EKytRiskLevel.High]: 'High risk detected',
    [EKytRiskLevel.Severe]: 'Severe risk detected',
    [EKytRiskLevel.Failed]: 'Risk check unavailable',
  } satisfies Record<EKytRiskLevel, string>,
  // Address-context level descriptions (figure 5/6 wording).
  levelDescription: {
    [EKytRiskLevel.Checking]:
      'We are still analyzing this address. Please check back in a moment.',
    [EKytRiskLevel.None]:
      'No significant risk was found for this address on the selected network.',
    [EKytRiskLevel.Low]: 'No clear high-risk sources found for this address.',
    [EKytRiskLevel.Moderate]:
      'This address has some risk exposure on the selected network.',
    [EKytRiskLevel.High]:
      'This address is linked to high-risk entities on the selected network.',
    [EKytRiskLevel.Severe]:
      'This address is linked to severe-risk entities on the selected network.',
    [EKytRiskLevel.Failed]:
      'We could not complete the risk check for this address. Please try again later.',
  } satisfies Record<EKytRiskLevel, string>,
};
