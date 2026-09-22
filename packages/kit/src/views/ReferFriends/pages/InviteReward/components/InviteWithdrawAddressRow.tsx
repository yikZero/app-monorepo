import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import { SizableText, YStack } from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useNavigateToEditAddress } from '@onekeyhq/kit/src/views/ReferFriends/pages/EditAddress/hooks/useNavigateToEditAddress';
import { getInviteWithdrawAddress } from '@onekeyhq/kit/src/views/ReferFriends/pages/RewardDistributionHistory/getInviteWithdrawAddress';
import { openInviteWithdrawAddressEditor } from '@onekeyhq/kit/src/views/ReferFriends/pages/RewardDistributionHistory/openInviteWithdrawAddressEditor';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';

import { ReferFriendsTestIDs } from '../../../testIDs';

function shortenWithdrawAddress(address: string) {
  return accountUtils.shortenAddress({
    address,
    leadingLength: 6,
    trailingLength: 5,
  });
}

export function InviteWithdrawAddressRow({
  summaryInfo,
  fetchSummaryInfo,
  layout = 'row',
}: {
  summaryInfo: IInviteSummary;
  fetchSummaryInfo: () => unknown;
  layout?: 'row' | 'stat';
}) {
  const intl = useIntl();
  const navigateToEditAddress = useNavigateToEditAddress();
  const withdrawAddress = getInviteWithdrawAddress(
    summaryInfo.withdrawAddresses,
  );
  const title = intl.formatMessage({
    id: ETranslations.referral_reward_received_address,
  });
  const subtitle = withdrawAddress
    ? shortenWithdrawAddress(withdrawAddress.address)
    : intl.formatMessage({
        id: ETranslations.referral_reward_received_address_notset,
      });

  const toEditAddressPage = useCallback(() => {
    openInviteWithdrawAddressEditor({
      summaryInfo,
      navigateToEditAddress,
      fetchSummaryInfo,
      formatMessage: (descriptor) => intl.formatMessage(descriptor),
    });
  }, [fetchSummaryInfo, intl, navigateToEditAddress, summaryInfo]);

  if (layout === 'stat') {
    return (
      <YStack
        testID={ReferFriendsTestIDs.inviteWithdrawAddressRow}
        flex={1}
        gap="$1"
        cursor="pointer"
        onPress={toEditAddressPage}
      >
        <SizableText size="$bodySm" color="$textSubdued">
          {`${title} ›`}
        </SizableText>
        <SizableText size="$bodyLgMedium" numberOfLines={1}>
          {subtitle}
        </SizableText>
      </YStack>
    );
  }

  return (
    <ListItem
      testID={ReferFriendsTestIDs.inviteWithdrawAddressRow}
      mx="$0"
      px="$0"
      title={title}
      subtitle={subtitle}
      drillIn
      onPress={toEditAddressPage}
    />
  );
}
