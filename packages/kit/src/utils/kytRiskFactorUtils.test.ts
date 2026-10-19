import { ETranslations } from '@onekeyhq/shared/src/locale';

import { formatKytRiskFactorEntity } from './kytRiskFactorUtils';

import type { IntlShape } from 'react-intl';

// Echo the translation id so tests assert which key a label maps to.
const intl = {
  formatMessage: ({ id }: { id: string }) => `t:${id}`,
} as unknown as IntlShape;

describe('formatKytRiskFactorEntity', () => {
  it.each([
    ['Theft', ETranslations.kyt_risk_entity_theft__title],
    ['Fake_Phishing', ETranslations.kyt_risk_entity_phishing__title],
    [
      'zero transfer scam',
      ETranslations.kyt_risk_entity_zero_transfer_scam__title,
    ],
    ['  OFAC Sanctions ', ETranslations.kyt_risk_entity_ofac_sanctions__title],
    [
      'Guarantee Merchant',
      ETranslations.kyt_risk_entity_guarantee_merchant__title,
    ],
    [
      'Sanctioned Entity',
      ETranslations.kyt_risk_factor_sanctioned_entity__title,
    ],
  ])('translates the generic label %j', (entity, id) => {
    expect(formatKytRiskFactorEntity({ entity, intl })).toBe(`t:${id}`);
  });

  it.each(['changenow', 'ChangeHero.io', 'Bybit Hacker', 'htx'])(
    'keeps the brand or incident name %j as is',
    (entity) => {
      expect(formatKytRiskFactorEntity({ entity, intl })).toBe(entity);
    },
  );
});
