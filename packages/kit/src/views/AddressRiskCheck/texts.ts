/**
 * Temporary hardcoded English copy for the Address Risk Check feature.
 *
 * TODO(i18n): these strings have no Lokalise keys yet. Product will supplement
 * the translation keys later; once they land, replace each usage with the
 * generated `ETranslations` member and delete the corresponding entry here.
 * Existing reusable strings already use `ETranslations.*` directly in the code.
 */
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
  // Address-context level descriptions (figure 5/6 wording).
  levelDescription: {
    none: 'No significant risk was found for this address on the selected network.',
    low: 'No clear high-risk sources found for this address.',
    moderate: 'This address has some risk exposure on the selected network.',
    high: 'This address is linked to high-risk entities on the selected network.',
    severe:
      'This address is linked to severe-risk entities on the selected network.',
  } as Record<string, string>,
};
