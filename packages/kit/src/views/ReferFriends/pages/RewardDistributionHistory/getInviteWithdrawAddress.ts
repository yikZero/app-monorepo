import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';

export function getInviteWithdrawAddress(
  withdrawAddresses: IInviteSummary['withdrawAddresses'] | undefined,
) {
  return withdrawAddresses?.[0];
}
