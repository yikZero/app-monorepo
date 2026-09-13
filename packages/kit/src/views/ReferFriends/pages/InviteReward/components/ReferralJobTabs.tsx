import { useMemo } from 'react';

import { useLocaleVariant } from '@onekeyhq/kit/src/hooks/useLocaleVariant';
import { SimpleTabs } from '@onekeyhq/kit/src/views/ReferFriends/components';

import { ReferFriendsTestIDs } from '../../../testIDs';
import { getReferralJobTabLabels } from '../getReferralJobTabLabels';
import { EReferralPageTab, type IReferralPageTab } from '../referralPageTab';

export function ReferralJobTabs({
  value,
  onChange,
}: {
  value: IReferralPageTab;
  onChange: (value: IReferralPageTab) => void;
}) {
  const locale = useLocaleVariant();
  const tabs = useMemo(() => {
    const labels = getReferralJobTabLabels(locale);
    return [
      {
        value: EReferralPageTab.invite,
        label: labels.invite,
        testID: ReferFriendsTestIDs.inviteTab,
      },
      {
        value: EReferralPageTab.benefits,
        label: labels.benefits,
        testID: ReferFriendsTestIDs.benefitsTab,
      },
    ];
  }, [locale]);

  return <SimpleTabs value={value} onChange={onChange} tabs={tabs} />;
}
