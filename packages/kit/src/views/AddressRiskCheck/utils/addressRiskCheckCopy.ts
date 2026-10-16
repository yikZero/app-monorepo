// TODO(i18n): Hardcoded English copy for the address risk check result page.
// Each key is the proposed Lokalise translation id; move these into
// ETranslations and replace `formatAddressRiskCopy` with `intl.formatMessage`
// once the keys are created. Placeholders use ICU-style named arguments.
export const ADDRESS_RISK_CHECK_COPY = {
  address_risk_check_level_clean__desc:
    'No exposure to known risk entities. Still verify the full address before sending.',
  address_risk_check_level_low__desc:
    'Minor exposure to risk entities. Still verify the full address before sending.',
  address_risk_check_level_moderate__desc:
    'Some exposure to risk entities. Review the sources below before sending.',
  address_risk_check_level_high__desc:
    'Significant exposure to high-risk entities.',
  address_risk_check_level_severe__desc:
    'Heavy exposure to severe-risk entities, such as sanctioned or stolen funds.',

  address_risk_check_exchange_flag__desc:
    'Regulated exchanges may flag your address after you interact with this one.',
  address_risk_check_severe_advice__title: "Sending isn't recommended",

  address_risk_check_score__title: 'Risk score',
  address_risk_check_score__value: '{score}/100',
  address_risk_check_score_tooltip__desc:
    "Scored from 0 to 100 based on this address's transaction history. Higher scores mean larger or closer links to risk entities.",
  address_risk_check_score_ranges__title: 'Score ranges',

  address_risk_check_stats_exposures__title: 'Exposures',
  address_risk_check_stats_direct__title: 'Direct',
  address_risk_check_stats_largest_share__title: 'Largest share',

  address_risk_check_exposure_breakdown__title: 'Exposure breakdown',
  address_risk_check_exposure_direct__title: 'Direct',
  address_risk_check_exposure_indirect__title: 'Indirect',
  address_risk_check_exposure_direct__desc:
    'This address transacted with the entity.',
  address_risk_check_exposure_indirect__desc:
    'Funds moved through other addresses. Hops count the steps in between.',
  address_risk_check_exposure_share__desc:
    "Share of this address's total transaction volume linked to the entity.",
  address_risk_check_show_more_exposures__action: 'Show {count} more',
  address_risk_check_show_more_minor_exposures__action:
    'Show {count} more, each under 0.1%',

  address_risk_check_category_sanctioned_entity__desc:
    'On a sanctions list, such as Garantex.',
  address_risk_check_category_illicit_activity__desc:
    'Tied to theft, phishing, scams, or laundering.',
  address_risk_check_category_mixer__desc:
    'Obscures where funds came from, such as Tornado Cash.',
  address_risk_check_category_risk_exchange__desc:
    "Exchange that doesn't require KYC.",
  address_risk_check_category_gambling__desc: 'Online gambling service.',
  address_risk_check_category_bridge__desc:
    'Cross-chain bridge. Common in normal use.',

  address_risk_check_continue_high_risk__title:
    'Continue to a high-risk address?',

  address_risk_check_source_disclaimer__desc:
    "Risk data from {provider}. Results are for reference only and don't block transfers.",
  address_risk_check_disclaimer__desc:
    "Results are for reference only and don't block transfers.",
} as const;

export type IAddressRiskCheckCopyKey = keyof typeof ADDRESS_RISK_CHECK_COPY;

export function formatAddressRiskCopy(
  key: IAddressRiskCheckCopyKey,
  values?: Record<string, string | number>,
): string {
  const template: string = ADDRESS_RISK_CHECK_COPY[key];
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    values[name] === undefined ? match : String(values[name]),
  );
}
