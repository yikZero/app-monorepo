import { useMemo } from 'react';

import { useIntl } from 'react-intl';

import {
  Divider,
  Icon,
  SizableText,
  XStack,
  YStack,
  useMedia,
} from '@onekeyhq/components';
import { Currency } from '@onekeyhq/kit/src/components/Currency';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useNavigateToRewardHistory } from '@onekeyhq/kit/src/views/ReferFriends/pages/RewardDistributionHistory/hooks/useNavigateToRewardHistory';
import { useNavigateToYourReferred } from '@onekeyhq/kit/src/views/ReferFriends/pages/YourReferred/hooks';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';

import { ReferFriendsTestIDs } from '../../../testIDs';

import { getInviteEarningsState } from './getInviteEarningsState';
import { getInviteLayoutCopy } from './getInviteLayoutCopy';
import { InviteWithdrawAddressRow } from './InviteWithdrawAddressRow';

function CardTextAction({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <XStack
      testID={testID}
      ai="center"
      gap="$0.5"
      cursor="pointer"
      onPress={onPress}
    >
      <SizableText size="$bodyMd" color="$textSubdued">
        {label}
      </SizableText>
      <Icon name="ChevronRightSmallOutline" size="$4" color="$iconSubdued" />
    </XStack>
  );
}

function EarningsStat({ label, value }: { label: string; value: string }) {
  return (
    <YStack flex={1} gap="$1">
      <SizableText size="$bodySm" color="$textSubdued">
        {label}
      </SizableText>
      <Currency size="$bodyLgMedium">{value}</Currency>
    </YStack>
  );
}

function EarningsTotals({
  cumulativeLabel,
  distributedLabel,
  cumulative,
  distributed,
}: {
  cumulativeLabel: string;
  distributedLabel: string;
  cumulative: string;
  distributed: string;
}) {
  return (
    <XStack ai="center" gap="$1" flexWrap="wrap">
      <SizableText size="$bodySm" color="$textSubdued">
        {cumulativeLabel}
      </SizableText>
      <Currency size="$bodySmMedium">{cumulative}</Currency>
      <SizableText size="$bodySm" color="$textSubdued">
        ·
      </SizableText>
      <SizableText size="$bodySm" color="$textSubdued">
        {distributedLabel}
      </SizableText>
      <Currency size="$bodySmMedium">{distributed}</Currency>
    </XStack>
  );
}

function ActiveEarningsBody({
  isCompact,
  undistributedLabel,
  nextDistributionLabel,
  cumulativeLabel,
  distributedLabel,
  earnings,
  summaryInfo,
  fetchSummaryInfo,
}: {
  isCompact: boolean;
  undistributedLabel: string;
  nextDistributionLabel: string;
  cumulativeLabel: string;
  distributedLabel: string;
  earnings: ReturnType<typeof getInviteEarningsState>;
  summaryInfo: IInviteSummary;
  fetchSummaryInfo: () => void;
}) {
  return (
    <YStack gap="$2">
      <SizableText size="$bodyMd" color="$textSubdued">
        {undistributedLabel}
      </SizableText>
      <Currency size="$headingXl">{earnings.undistributed}</Currency>
      {earnings.nextDistribution ? (
        <SizableText size="$bodySm" color="$textSubdued">
          {`${nextDistributionLabel} ${earnings.nextDistribution}`}
        </SizableText>
      ) : null}
      <Divider />
      {isCompact ? (
        <EarningsTotals
          cumulativeLabel={cumulativeLabel}
          distributedLabel={distributedLabel}
          cumulative={earnings.cumulative}
          distributed={earnings.distributed}
        />
      ) : (
        <XStack gap="$3" ai="flex-start">
          <EarningsStat label={cumulativeLabel} value={earnings.cumulative} />
          <EarningsStat label={distributedLabel} value={earnings.distributed} />
          <InviteWithdrawAddressRow
            summaryInfo={summaryInfo}
            fetchSummaryInfo={fetchSummaryInfo}
            layout="stat"
          />
        </XStack>
      )}
    </YStack>
  );
}

export function InviteEarningsCard({
  summaryInfo,
  fetchSummaryInfo,
}: {
  summaryInfo: IInviteSummary;
  fetchSummaryInfo: () => void;
}) {
  const intl = useIntl();
  const { md } = useMedia();
  const navigateToRewardHistory = useNavigateToRewardHistory();
  const navigateToYourReferred = useNavigateToYourReferred();
  const copy = getInviteLayoutCopy(intl.locale);
  const earnings = useMemo(
    () => getInviteEarningsState(summaryInfo.cumulativeRewards),
    [summaryInfo.cumulativeRewards],
  );
  const undistributedLabel = intl.formatMessage({
    id: ETranslations.referral_undistributed,
  });
  const distributedLabel = intl.formatMessage({
    id: ETranslations.referral_distributed,
  });
  const referredLabel = intl.formatMessage({
    id: ETranslations.referral_referral_list,
  });
  const historyLabel = copy.rewardHistory;

  return (
    <YStack
      testID={ReferFriendsTestIDs.inviteEarningsCard}
      borderWidth={1}
      borderColor="$borderSubdued"
      borderRadius="$3"
      bg="$bgSubdued"
      p="$4"
      gap="$2"
    >
      <XStack jc="flex-end">
        <CardTextAction
          testID={ReferFriendsTestIDs.inviteYourReferred}
          label={referredLabel}
          onPress={navigateToYourReferred}
        />
      </XStack>
      {earnings.isZero ? (
        <ListItem
          mx="$0"
          px="$0"
          title={undistributedLabel}
          drillIn
          onPress={navigateToRewardHistory}
        >
          <Currency size="$bodyMdMedium">{earnings.undistributed}</Currency>
        </ListItem>
      ) : (
        <ActiveEarningsBody
          isCompact={md}
          undistributedLabel={undistributedLabel}
          nextDistributionLabel={intl.formatMessage({
            id: ETranslations.referral_next_distribution,
          })}
          cumulativeLabel={copy.cumulativeEarnings}
          distributedLabel={distributedLabel}
          earnings={earnings}
          summaryInfo={summaryInfo}
          fetchSummaryInfo={fetchSummaryInfo}
        />
      )}
      {md || earnings.isZero ? (
        <InviteWithdrawAddressRow
          summaryInfo={summaryInfo}
          fetchSummaryInfo={fetchSummaryInfo}
        />
      ) : null}
      {earnings.isZero ? null : (
        <ListItem
          testID={ReferFriendsTestIDs.inviteRewardHistory}
          mx="$0"
          px="$0"
          title={historyLabel}
          drillIn
          onPress={navigateToRewardHistory}
        />
      )}
    </YStack>
  );
}
