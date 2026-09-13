import { useMemo } from 'react';

import { useIntl } from 'react-intl';

import { SimpleTabs } from '@onekeyhq/kit/src/views/ReferFriends/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { ReferFriendsTestIDs } from '../../../testIDs';
import { EReferralPageTab, type IReferralPageTab } from '../referralPageTab';

export function ReferralJobTabs({
  value,
  onChange,
}: {
  value: IReferralPageTab;
  onChange: (value: IReferralPageTab) => void;
}) {
  const intl = useIntl();
  const tabs = useMemo(
    () => [
      {
        value: EReferralPageTab.invite,
        label: intl.formatMessage({
          id: ETranslations.activity_hub_invite__action,
        }),
        testID: ReferFriendsTestIDs.inviteTab,
      },
      {
        value: EReferralPageTab.benefits,
        label: intl.formatMessage({
          id: ETranslations.activity_hub_my_rewards__action,
        }),
        testID: ReferFriendsTestIDs.benefitsTab,
      },
    ],
    [intl],
  );

  return <SimpleTabs value={value} onChange={onChange} tabs={tabs} />;
}
