import { getReferralJobTabLabels } from './getReferralJobTabLabels';

describe('getReferralJobTabLabels', () => {
  it('uses locked 邀请 | 福利 for Chinese locales', () => {
    expect(getReferralJobTabLabels('zh-CN')).toEqual({
      invite: '邀请',
      benefits: '福利',
    });
    expect(getReferralJobTabLabels('zh-HK')).toEqual({
      invite: '邀请',
      benefits: '福利',
    });
    expect(getReferralJobTabLabels('zh-TW')).toEqual({
      invite: '邀请',
      benefits: '福利',
    });
  });

  it('uses Invite | Benefits until Lokalise keys exist', () => {
    expect(getReferralJobTabLabels('en-US')).toEqual({
      invite: 'Invite',
      benefits: 'Benefits',
    });
    expect(getReferralJobTabLabels('ja-JP')).toEqual({
      invite: 'Invite',
      benefits: 'Benefits',
    });
  });
});
