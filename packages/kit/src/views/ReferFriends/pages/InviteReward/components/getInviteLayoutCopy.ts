export interface IInviteLayoutCopy {
  headline: string;
  cumulativeEarnings: string;
  manageCodes: string;
  levelBenefits: string;
  rewardDetails: string;
  rewardHistory: string;
  viewDetails: string;
}

const ZH_COPY: IInviteLayoutCopy = {
  headline: '邀请好友，赚取返佣',
  cumulativeEarnings: '累计收益',
  manageCodes: '管理邀请码',
  levelBenefits: '等级权益',
  rewardDetails: '奖励明细',
  rewardHistory: '奖励记录',
  viewDetails: '查看明细',
};

const EN_COPY: IInviteLayoutCopy = {
  headline: 'Invite friends, earn commission',
  cumulativeEarnings: 'Cumulative earnings',
  manageCodes: 'Manage codes',
  levelBenefits: 'Level benefits',
  rewardDetails: 'Reward details',
  rewardHistory: 'Reward history',
  viewDetails: 'View details',
};

export function getInviteLayoutCopy(locale: string): IInviteLayoutCopy {
  if (locale.toLowerCase().startsWith('zh')) {
    return ZH_COPY;
  }
  return EN_COPY;
}
