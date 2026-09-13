import { Toast } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';
import type { IModalReferFriendsParamList } from '@onekeyhq/shared/src/routes';

import { getInviteWithdrawAddress } from './getInviteWithdrawAddress';

type IEditAddressParams = IModalReferFriendsParamList['EditAddress'];

export function openInviteWithdrawAddressEditor({
  summaryInfo,
  navigateToEditAddress,
  fetchSummaryInfo,
  formatMessage,
}: {
  summaryInfo?: IInviteSummary;
  navigateToEditAddress: (params: IEditAddressParams) => void;
  fetchSummaryInfo: () => unknown;
  formatMessage: (descriptor: { id: ETranslations }) => string;
}) {
  if (!summaryInfo) {
    return;
  }

  const withdrawAddress = getInviteWithdrawAddress(
    summaryInfo.withdrawAddresses,
  );

  navigateToEditAddress({
    enabledNetworks: summaryInfo.enabledNetworks,
    // Inviter payouts bind to OneKey ID, not the Home Account selector.
    accountId: '',
    address: withdrawAddress?.address,
    hideAddressBook: !!platformEnv.isWebDappMode,
    enableAllowListValidation: false,
    onAddressAdded: ({ networkId }) => {
      Toast.success({
        title: formatMessage({
          id: ETranslations.referral_address_updated,
        }),
      });
      setTimeout(() => {
        void fetchSummaryInfo();
      }, 50);
      defaultLogger.referral.page.editReceivingAddress({
        networkId,
        editMethod: withdrawAddress ? 'edit' : 'new',
      });
    },
  });
}
