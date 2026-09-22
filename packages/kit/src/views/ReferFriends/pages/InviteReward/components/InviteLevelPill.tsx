import { useIntl } from 'react-intl';

import { Icon, SizableText, XStack } from '@onekeyhq/components';
import { useNavigateToReferralLevel } from '@onekeyhq/kit/src/views/ReferFriends/pages/ReferralLevel/hooks/useNavigateToReferralLevel';

import { ReferFriendsTestIDs } from '../../../testIDs';

import { useCurrentLevelCard } from './CurrentLevelCard/hooks/useCurrentLevelCard';
import { getInviteLayoutCopy } from './getInviteLayoutCopy';

import type { ICurrentLevelCardProps } from './CurrentLevelCard/types';

export function InviteLevelPill({
  showBenefitsLabel,
  ...props
}: ICurrentLevelCardProps & { showBenefitsLabel: boolean }) {
  const intl = useIntl();
  const { levelLabel } = useCurrentLevelCard(props);
  const navigateToReferralLevel = useNavigateToReferralLevel();
  const copy = getInviteLayoutCopy(intl.locale);

  return (
    <XStack
      testID={ReferFriendsTestIDs.inviteLevelPill}
      ai="center"
      gap="$1"
      px="$2"
      py="$1"
      borderRadius="$full"
      bg="$bgSubdued"
      flexShrink={1}
      cursor="pointer"
      onPress={() => {
        void navigateToReferralLevel();
      }}
    >
      {props.rebateConfig.emoji ? (
        <SizableText size="$bodyMd">{props.rebateConfig.emoji}</SizableText>
      ) : null}
      <SizableText size="$bodyMdMedium" numberOfLines={1} flexShrink={1}>
        {levelLabel}
      </SizableText>
      {showBenefitsLabel ? (
        <SizableText size="$bodyMd" color="$textSubdued" numberOfLines={1}>
          {`· ${copy.levelBenefits}`}
        </SizableText>
      ) : null}
      <Icon name="ChevronRightSmallOutline" size="$4" color="$iconSubdued" />
    </XStack>
  );
}
