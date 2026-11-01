import { memo, useCallback } from 'react';
import type { ReactElement } from 'react';

import { useIntl } from 'react-intl';

import { Page, YStack } from '@onekeyhq/components';
import type { IPageProps } from '@onekeyhq/components';
import {
  getReferralShareCopy,
  showReferralShareDialog,
} from '@onekeyhq/kit/src/views/ReferFriends/components/ReferralShare';
import { formatInviteUrlForDisplay } from '@onekeyhq/kit/src/views/ReferFriends/utils/inviteUrlUtils';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type {
  IInviteLevelDetail,
  IInviteSummary,
} from '@onekeyhq/shared/src/referralCode/type';

import { ReferFriendsTestIDs } from '../../../testIDs';
import { useReferralTabCopy } from '../referralTabCopy';

import { useInviteValueSummary } from './InviteValueLine';
import {
  PinnedReferralCrossLinkFooter,
  ReferralTabCrossLink,
} from './ReferralTabCrossLink';
import { INVITE_CARD_BORDER_COLOR } from './useInviteCardStyle';

const INVITE_FOOTER_BUTTON_PROPS = {
  testID: ReferFriendsTestIDs.inviteFriendsFooterBtn,
  icon: 'AddPeopleOutline',
} as const;

// The button opens the share card. Copying alone stays on the invite rows.
const InviteShareActions = memo(function InviteShareActions({
  summaryInfo,
  levelDetail,
  backgroundColor,
}: {
  summaryInfo: IInviteSummary;
  levelDetail: IInviteLevelDetail | undefined;
  backgroundColor: IPageProps['backgroundColor'];
}) {
  const { summary } = useInviteValueSummary({
    rebateConfig: summaryInfo.rebateConfig,
    rebateLevels: summaryInfo.rebateLevels,
    levelDetail,
  });
  const intl = useIntl();
  const inviteeRate = summary?.friendRate;
  const handleInvite = useCallback(() => {
    showReferralShareDialog({
      copy: getReferralShareCopy(intl, inviteeRate),
      inviteCode: summaryInfo.inviteCode,
      inviteUrl: summaryInfo.inviteUrl,
      displayUrl: formatInviteUrlForDisplay(summaryInfo.inviteUrl),
    });
  }, [intl, inviteeRate, summaryInfo.inviteCode, summaryInfo.inviteUrl]);

  return (
    <Page.FooterActions
      bg={backgroundColor}
      onConfirm={handleInvite}
      onConfirmText={intl.formatMessage({
        id: ETranslations.referral_invite_friends__action,
      })}
      confirmButtonProps={INVITE_FOOTER_BUTTON_PROPS}
    />
  );
});

// One footer slot. A share-only footer keeps the previous button padding;
// adding the cross-link must not change that safe-area path.
export const ReferralPageFooter = memo(function ReferralPageFooter({
  pinCrossLink,
  showShareButton,
  isInviteTab,
  summaryInfo,
  levelDetail,
  backgroundColor,
  onOpenPerks,
  onOpenInvite,
}: {
  pinCrossLink: boolean;
  showShareButton: boolean;
  isInviteTab: boolean;
  summaryInfo?: IInviteSummary;
  levelDetail?: IInviteLevelDetail;
  backgroundColor: IPageProps['backgroundColor'];
  onOpenPerks?: () => void;
  onOpenInvite?: () => void;
}) {
  const share =
    showShareButton && summaryInfo ? (
      <InviteShareActions
        summaryInfo={summaryInfo}
        levelDetail={levelDetail}
        backgroundColor={backgroundColor}
      />
    ) : null;
  const onPress = isInviteTab ? onOpenPerks : onOpenInvite;
  if (!pinCrossLink || !onPress) {
    return share ? <Page.Footer>{share}</Page.Footer> : null;
  }
  return (
    <PinnedCrossLinkFooter
      isInviteTab={isInviteTab}
      onPress={onPress}
      share={share}
      backgroundColor={backgroundColor}
    />
  );
});

function PinnedCrossLinkFooter({
  isInviteTab,
  onPress,
  share,
  backgroundColor,
}: {
  isInviteTab: boolean;
  onPress: () => void;
  share: ReactElement | null;
  backgroundColor: IPageProps['backgroundColor'];
}) {
  const tabCopy = useReferralTabCopy();
  const prompt = isInviteTab ? tabCopy.toPerksPrompt : tabCopy.toInvitePrompt;
  const action = isInviteTab ? tabCopy.toPerksAction : tabCopy.toInviteAction;
  const testID = isInviteTab
    ? ReferFriendsTestIDs.toPerksLink
    : ReferFriendsTestIDs.toInviteLink;
  if (!share) {
    return (
      <PinnedReferralCrossLinkFooter
        prompt={prompt}
        action={action}
        onPress={onPress}
        testID={testID}
        backgroundColor={backgroundColor}
      />
    );
  }
  return (
    <Page.Footer>
      <YStack
        bg={backgroundColor}
        borderTopWidth={1}
        borderTopColor={INVITE_CARD_BORDER_COLOR}
      >
        <ReferralTabCrossLink
          pinned
          prompt={prompt}
          action={action}
          onPress={onPress}
          testID={testID}
        />
        {share}
      </YStack>
    </Page.Footer>
  );
}
