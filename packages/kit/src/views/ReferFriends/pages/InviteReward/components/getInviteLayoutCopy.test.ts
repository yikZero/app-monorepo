import { getInviteLayoutCopy } from './getInviteLayoutCopy';

describe('getInviteLayoutCopy', () => {
  it('uses the locked Chinese labels', () => {
    expect(getInviteLayoutCopy('zh-CN')).toEqual({
      headline: '邀请好友，赚取返佣',
      copyInviteLink: '复制邀请链接',
      cumulativeEarnings: '累计收益',
      manageCodes: '管理邀请码',
      levelBenefits: '等级权益',
      rewardDetails: '奖励明细',
      rewardHistory: '奖励记录',
      viewDetails: '查看明细',
    });
    expect(getInviteLayoutCopy('zh-HK').headline).toBe('邀请好友，赚取返佣');
    expect(getInviteLayoutCopy('ZH').levelBenefits).toBe('等级权益');
  });

  it('uses English until Lokalise keys exist', () => {
    expect(getInviteLayoutCopy('en-US').headline).toBe(
      'Invite friends, earn commission',
    );
    expect(getInviteLayoutCopy('ja-JP').manageCodes).toBe('Manage codes');
    expect(getInviteLayoutCopy('').cumulativeEarnings).toBe(
      'Cumulative earnings',
    );
  });
});
