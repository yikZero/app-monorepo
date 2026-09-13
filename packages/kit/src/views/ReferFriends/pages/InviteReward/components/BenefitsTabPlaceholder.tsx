import { Empty, YStack } from '@onekeyhq/components';
import { useLocaleVariant } from '@onekeyhq/kit/src/hooks/useLocaleVariant';

import { ReferFriendsTestIDs } from '../../../testIDs';
import { getReferralJobTabLabels } from '../getReferralJobTabLabels';

export function BenefitsTabPlaceholder() {
  const locale = useLocaleVariant();
  const { benefits } = getReferralJobTabLabels(locale);

  return (
    <YStack
      testID={ReferFriendsTestIDs.benefitsPlaceholder}
      flex={1}
      px="$pagePadding"
      py="$10"
    >
      <Empty icon="GiftOutline" title={benefits} />
    </YStack>
  );
}
