import { useIntl } from 'react-intl';

import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useNavigateToReferralLevel } from '@onekeyhq/kit/src/views/ReferFriends/pages/ReferralLevel/hooks/useNavigateToReferralLevel';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { ReferFriendsTestIDs } from '../../../testIDs';

import { useCurrentLevelCard } from './CurrentLevelCard/hooks/useCurrentLevelCard';

import type { ICurrentLevelCardProps } from './CurrentLevelCard/types';

export function InviteLevelRow(props: ICurrentLevelCardProps) {
  const intl = useIntl();
  const { levelLabel } = useCurrentLevelCard(props);
  const navigateToReferralLevel = useNavigateToReferralLevel();

  return (
    <ListItem
      testID={ReferFriendsTestIDs.inviteLevelRow}
      mx="$0"
      px="$0"
      title={intl.formatMessage({ id: ETranslations.referral_current_level })}
      subtitle={levelLabel}
      drillIn
      onPress={() => {
        void navigateToReferralLevel();
      }}
    />
  );
}
