import {
  getInviteValueLine,
  selectInviteValueLineItems,
} from './getInviteValueLine';

import type { IInviteValueLineItem } from './getInviteValueLine';

const GOLD_RATES: IInviteValueLineItem[] = [
  { subject: 'Earn', you: 10, enabled: true },
  { subject: 'Perp', you: 18, enabled: true },
  { subject: 'HardwareSales', you: 18, enabled: true },
];

describe('getInviteValueLine', () => {
  it('formats enabled inviter rates for the current level', () => {
    expect(getInviteValueLine(GOLD_RATES, 'zh-CN')).toBe(
      '硬件 18% · 合约 18% · DeFi 10%',
    );
    expect(getInviteValueLine(GOLD_RATES, 'en-US')).toBe(
      'Earn 18% on hardware · 18% on Perps fees · 10% on DeFi fees',
    );
  });

  it('hides the line when there are no enabled rates', () => {
    expect(getInviteValueLine([], 'zh-CN')).toBeNull();
    expect(
      getInviteValueLine(
        [{ subject: 'HardwareSales', you: 18, enabled: false }],
        'en-US',
      ),
    ).toBeNull();
    expect(
      getInviteValueLine(
        [{ subject: 'Perp', you: Number.NaN, enabled: true }],
        'zh-CN',
      ),
    ).toBeNull();
  });

  it('keeps a partial set and drops disabled subjects', () => {
    expect(
      getInviteValueLine(
        [
          { subject: 'Swap', you: 5, enabled: false },
          { subject: 'Perp', you: 18, enabled: true },
          { subject: 'HardwareSales', you: 0, enabled: true },
        ],
        'zh-HK',
      ),
    ).toBe('硬件 0% · 合约 18%');
  });

  it('uses English for non-Chinese locales and keeps one rate readable', () => {
    expect(
      getInviteValueLine(
        [{ subject: 'Earn', you: 10.5, enabled: true }],
        'ja-JP',
      ),
    ).toBe('Earn 10.5% on DeFi fees');
    expect(getInviteValueLine(GOLD_RATES, 'ZH').startsWith('硬件')).toBe(true);
  });
});

describe('selectInviteValueLineItems', () => {
  it('keeps hook rates when subjects are already the config keys', () => {
    expect(
      selectInviteValueLineItems({
        commissionRates: GOLD_RATES,
        configs: {
          HardwareSales: { rebate: 1, enabled: true },
        },
      }),
    ).toEqual(GOLD_RATES);
  });

  it('falls back to rebateConfig when hook subjects are not known keys', () => {
    expect(
      selectInviteValueLineItems({
        commissionRates: [{ subject: 'referral.hw', you: 1, enabled: true }],
        configs: {
          Perp: { rebate: 18, enabled: true },
          HardwareSales: { rebate: 18, enabled: false },
        },
      }),
    ).toEqual([
      { subject: 'Perp', you: 18, enabled: true },
      { subject: 'HardwareSales', you: 18, enabled: false },
    ]);
  });

  it('returns an empty list when both sources are empty', () => {
    expect(
      selectInviteValueLineItems({
        commissionRates: [],
        configs: undefined,
      }),
    ).toEqual([]);
    expect(
      selectInviteValueLineItems({
        commissionRates: [],
        configs: {},
      }),
    ).toEqual([]);
  });
});
