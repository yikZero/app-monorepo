import { ERecentFeatureId } from '../../../views/ActionCenter/recentFeatures/recentFeatureRegistry';

import { selectDisplayedRecentFeatures } from './selectDisplayedRecentFeatures';

describe('selectDisplayedRecentFeatures', () => {
  const records = (ids: ERecentFeatureId[]) =>
    ids.map((featureId) => ({ featureId }));

  it('keeps at most four items in order', () => {
    const result = selectDisplayedRecentFeatures(
      records([
        ERecentFeatureId.Scan,
        ERecentFeatureId.AddressBook,
        ERecentFeatureId.SettingNetwork,
        ERecentFeatureId.Prime,
        ERecentFeatureId.BulkSend,
      ]),
    );
    expect(result.map((item) => item.featureId)).toEqual([
      ERecentFeatureId.Scan,
      ERecentFeatureId.AddressBook,
      ERecentFeatureId.SettingNetwork,
      ERecentFeatureId.Prime,
    ]);
  });

  it('keeps only the newest main tab', () => {
    const result = selectDisplayedRecentFeatures(
      records([
        ERecentFeatureId.Swap,
        ERecentFeatureId.Market,
        ERecentFeatureId.AddressRiskCheck,
        ERecentFeatureId.Earn,
        ERecentFeatureId.Referral,
      ]),
    );
    expect(result.map((item) => item.featureId)).toEqual([
      ERecentFeatureId.Swap,
      ERecentFeatureId.AddressRiskCheck,
      ERecentFeatureId.Referral,
    ]);
  });
});
