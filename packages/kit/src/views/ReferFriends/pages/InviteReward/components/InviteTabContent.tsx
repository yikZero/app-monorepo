import { YStack } from '@onekeyhq/components';
import { ResponsiveTwoColumnLayout } from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/components/shared';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';

import { InviteBindRow } from './InviteBindRow';
import { InviteCodeHero } from './InviteCodeHero';
import { InviteEarningsRow } from './InviteEarningsRow';
import { InviteLevelRow } from './InviteLevelRow';
import { InviteRewardEntries } from './InviteRewardEntries';
import { SectionHeader } from './SectionHeader';
import { SuspensionAlert } from './SuspensionAlert';

export function InviteTabContent({
  summaryInfo,
  fetchSummaryInfo,
}: {
  summaryInfo?: IInviteSummary;
  fetchSummaryInfo: () => void;
}) {
  return (
    <YStack pb="$6">
      {summaryInfo ? (
        <SuspensionAlert
          suspensionNotice={summaryInfo.suspensionNotice}
          suspensionContactLabel={summaryInfo.suspensionContactLabel}
        />
      ) : null}

      <ResponsiveTwoColumnLayout
        leftColumn={
          <YStack gap="$3">
            {summaryInfo ? (
              <InviteCodeHero
                inviteUrl={summaryInfo.inviteUrl}
                inviteCode={summaryInfo.inviteCode}
              />
            ) : null}
            <InviteBindRow />
          </YStack>
        }
        rightColumn={
          summaryInfo ? (
            <InviteEarningsRow
              cumulativeRewards={summaryInfo.cumulativeRewards}
            />
          ) : null
        }
      />

      {summaryInfo ? (
        <YStack px="$pagePadding" pt="$2">
          <InviteLevelRow
            rebateConfig={summaryInfo.rebateConfig}
            rebateLevels={summaryInfo.rebateLevels}
          />
          <YStack pt="$2">
            <SectionHeader
              translationId={ETranslations.referral_invitation_details}
            />
            <InviteRewardEntries
              summaryInfo={summaryInfo}
              fetchSummaryInfo={fetchSummaryInfo}
            />
          </YStack>
        </YStack>
      ) : null}
    </YStack>
  );
}
