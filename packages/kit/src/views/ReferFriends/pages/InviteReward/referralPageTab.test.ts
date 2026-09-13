import { EReferralPageTab, resolveReferralPageTab } from './referralPageTab';

describe('resolveReferralPageTab', () => {
  it('defaults to invite when the param is missing or unknown', () => {
    expect(resolveReferralPageTab()).toBe(EReferralPageTab.invite);
    expect(resolveReferralPageTab(undefined)).toBe(EReferralPageTab.invite);
    expect(resolveReferralPageTab(null)).toBe(EReferralPageTab.invite);
    expect(resolveReferralPageTab('')).toBe(EReferralPageTab.invite);
    expect(resolveReferralPageTab('rewards')).toBe(EReferralPageTab.invite);
  });

  it('keeps invite and benefits when the param is exact', () => {
    expect(resolveReferralPageTab('invite')).toBe(EReferralPageTab.invite);
    expect(resolveReferralPageTab('benefits')).toBe(EReferralPageTab.benefits);
  });
});
