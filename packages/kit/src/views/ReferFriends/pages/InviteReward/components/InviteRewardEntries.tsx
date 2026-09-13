import { useCallback, useState } from 'react';

import { useIntl } from 'react-intl';

import { YStack } from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useNavigateToEarnReward } from '@onekeyhq/kit/src/views/ReferFriends/pages/EarnReward/hooks/useNavigateToEarnReward';
import { useNavigateToHardwareSalesReward } from '@onekeyhq/kit/src/views/ReferFriends/pages/HardwareSalesReward/hooks/useNavigateToHardwareSalesReward';
import { useNavigateToPerpsReward } from '@onekeyhq/kit/src/views/ReferFriends/pages/PerpsReward/hooks/useNavigateToPerpsReward';
import { useNavigateToSwapReward } from '@onekeyhq/kit/src/views/ReferFriends/pages/SwapReward/hooks/useNavigateToSwapReward';
import { useNavigateToYourReferred } from '@onekeyhq/kit/src/views/ReferFriends/pages/YourReferred/hooks';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';

import { CreateCodeButton } from './InvitationDetailsSection/components/CreateCodeButton';
import { InviteCodeListTable } from './InvitationDetailsSection/components/InviteCodeListTable';
import { useInviteCodeList } from './InvitationDetailsSection/hooks/useInviteCodeList';

export function InviteRewardEntries({
  summaryInfo,
  fetchSummaryInfo,
}: {
  summaryInfo: IInviteSummary;
  fetchSummaryInfo: () => void;
}) {
  const intl = useIntl();
  const [isCodesOpen, setIsCodesOpen] = useState(false);
  const navigateToHardwareSalesReward = useNavigateToHardwareSalesReward();
  const navigateToPerpsReward = useNavigateToPerpsReward();
  const navigateToSwapReward = useNavigateToSwapReward();
  const navigateToEarnReward = useNavigateToEarnReward();
  const navigateToYourReferred = useNavigateToYourReferred();
  const { codeListData, isLoading, refetch } = useInviteCodeList();

  const handleCodeUpdated = useCallback(
    async (shouldRefreshSummary?: boolean) => {
      if (shouldRefreshSummary) {
        fetchSummaryInfo();
      }
      await refetch();
    },
    [fetchSummaryInfo, refetch],
  );

  return (
    <YStack>
      <ListItem
        mx="$0"
        px="$0"
        title={intl.formatMessage({
          id: ETranslations.referral_referred_type_3,
        })}
        drillIn
        onPress={navigateToHardwareSalesReward}
      />
      <ListItem
        mx="$0"
        px="$0"
        title={intl.formatMessage({ id: ETranslations.referral_perps })}
        drillIn
        onPress={navigateToPerpsReward}
      />
      <ListItem
        mx="$0"
        px="$0"
        title={intl.formatMessage({
          id: ETranslations.swap_referral_link__title,
        })}
        drillIn
        onPress={navigateToSwapReward}
      />
      <ListItem
        mx="$0"
        px="$0"
        title={intl.formatMessage({
          id: ETranslations.referral_referred_type_2,
        })}
        drillIn
        onPress={() => {
          navigateToEarnReward(summaryInfo.Onchain.title || '');
        }}
      />
      <ListItem
        mx="$0"
        px="$0"
        title={intl.formatMessage({ id: ETranslations.referral_referral_list })}
        drillIn
        onPress={navigateToYourReferred}
      />
      <ListItem
        mx="$0"
        px="$0"
        title={intl.formatMessage({ id: ETranslations.referral_your_code })}
        drillIn
        onPress={() => {
          setIsCodesOpen((open) => !open);
        }}
      />
      {isCodesOpen ? (
        <YStack gap="$3" pt="$2">
          <CreateCodeButton
            remainingCodes={codeListData?.remainingCodes}
            onCodeCreated={() => {
              void refetch();
            }}
            inviteUrlTemplate={summaryInfo.inviteUrl}
          />
          <InviteCodeListTable
            codeListData={codeListData}
            isLoading={isLoading ?? false}
            refetch={refetch}
            onCodeUpdated={handleCodeUpdated}
          />
        </YStack>
      ) : null}
    </YStack>
  );
}
