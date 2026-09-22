import { useCallback, useState } from 'react';

import { YStack, useMedia } from '@onekeyhq/components';
import { ResponsiveTwoColumnLayout } from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/components/shared';
import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';

import { InviteBindRow } from './InviteBindRow';
import { InviteCodeManager } from './InviteCodeManager';
import { InviteEarningsCard } from './InviteEarningsCard';
import { InviteLinkHero } from './InviteLinkHero';
import { InviteRewardRows } from './InviteRewardRows';
import { SuspensionAlert } from './SuspensionAlert';

export function InviteTabContent({
  summaryInfo,
  fetchSummaryInfo,
}: {
  summaryInfo?: IInviteSummary;
  fetchSummaryInfo: () => void;
}) {
  const { md } = useMedia();
  const [isCodesOpen, setIsCodesOpen] = useState(false);
  const toggleManageCodes = useCallback(() => {
    setIsCodesOpen((open) => !open);
  }, []);

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
          <YStack
            gap="$3"
            borderWidth={md ? 0 : 1}
            borderColor="$borderSubdued"
            borderRadius="$3"
            p={md ? '$0' : '$4'}
          >
            {summaryInfo ? (
              <InviteLinkHero
                inviteUrl={summaryInfo.inviteUrl}
                inviteCode={summaryInfo.inviteCode}
                rebateConfig={summaryInfo.rebateConfig}
                rebateLevels={summaryInfo.rebateLevels}
                onToggleManageCodes={toggleManageCodes}
              />
            ) : null}
            <InviteBindRow />
          </YStack>
        }
        rightColumn={
          summaryInfo ? (
            <InviteEarningsCard
              summaryInfo={summaryInfo}
              fetchSummaryInfo={fetchSummaryInfo}
            />
          ) : null
        }
      />

      {summaryInfo ? <InviteRewardRows summaryInfo={summaryInfo} /> : null}
      {isCodesOpen && summaryInfo ? (
        <InviteCodeManager
          inviteUrl={summaryInfo.inviteUrl}
          fetchSummaryInfo={fetchSummaryInfo}
        />
      ) : null}
    </YStack>
  );
}
