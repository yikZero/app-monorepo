import BigNumber from 'bignumber.js';

export interface IInviteEarningsInput {
  distributed?: string;
  undistributed?: string;
  nextDistribution?: string;
}

export interface IInviteEarningsState {
  isZero: boolean;
  undistributed: string;
  distributed: string;
  cumulative: string;
  nextDistribution: string | null;
}

function toAmount(value: string | undefined) {
  const amount = new BigNumber(value ?? 0);
  return amount.isFinite() ? amount : new BigNumber(0);
}

function formatNextDistribution(value: string | undefined) {
  if (!value) {
    return null;
  }
  const dated = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (dated) {
    return dated[1];
  }
  return value;
}

export function getInviteEarningsState(
  cumulativeRewards?: IInviteEarningsInput | null,
): IInviteEarningsState {
  const undistributed = toAmount(cumulativeRewards?.undistributed);
  const distributed = toAmount(cumulativeRewards?.distributed);
  const cumulative = distributed.plus(undistributed);

  return {
    isZero: undistributed.isZero() && distributed.isZero(),
    undistributed: undistributed.toFixed(2),
    distributed: distributed.toFixed(2),
    cumulative: cumulative.toFixed(2),
    nextDistribution: formatNextDistribution(
      cumulativeRewards?.nextDistribution,
    ),
  };
}
