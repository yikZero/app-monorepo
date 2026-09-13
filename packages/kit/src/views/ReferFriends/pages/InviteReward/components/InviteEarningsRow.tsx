import BigNumber from 'bignumber.js';
import { useIntl } from 'react-intl';

import { SizableText, XStack, YStack } from '@onekeyhq/components';
import { Currency } from '@onekeyhq/kit/src/components/Currency';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useNavigateToRewardHistory } from '@onekeyhq/kit/src/views/ReferFriends/pages/RewardDistributionHistory/hooks/useNavigateToRewardHistory';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';

import { ReferFriendsTestIDs } from '../../../testIDs';

export function InviteEarningsRow({
  cumulativeRewards,
}: {
  cumulativeRewards: IInviteSummary['cumulativeRewards'];
}) {
  const intl = useIntl();
  const navigateToRewardHistory = useNavigateToRewardHistory();
  const distributed = BigNumber(cumulativeRewards.distributed).toFixed(2);
  const undistributed = BigNumber(cumulativeRewards.undistributed).toFixed(2);

  return (
    <ListItem
      testID={ReferFriendsTestIDs.inviteEarningsRow}
      mx="$0"
      px="$0"
      drillIn
      onPress={navigateToRewardHistory}
    >
      <YStack flex={1} gap="$1">
        <SizableText size="$bodyLgMedium">
          {intl.formatMessage({
            id: ETranslations.referral_referral_you_earned,
          })}
        </SizableText>
        <XStack ai="center" gap="$2" flexWrap="wrap">
          <SizableText size="$bodySm" color="$textSubdued">
            {intl.formatMessage({ id: ETranslations.referral_distributed })}
          </SizableText>
          <Currency size="$bodyMdMedium">{distributed}</Currency>
          <SizableText size="$bodySm" color="$textSubdued">
            {intl.formatMessage({ id: ETranslations.referral_undistributed })}
          </SizableText>
          <Currency size="$bodyMdMedium">{undistributed}</Currency>
        </XStack>
      </YStack>
    </ListItem>
  );
}
