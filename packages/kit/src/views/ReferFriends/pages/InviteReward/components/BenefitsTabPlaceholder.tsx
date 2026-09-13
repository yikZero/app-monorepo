import { useIntl } from 'react-intl';

import { Empty, YStack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { ReferFriendsTestIDs } from '../../../testIDs';

export function BenefitsTabPlaceholder() {
  const intl = useIntl();

  return (
    <YStack
      testID={ReferFriendsTestIDs.benefitsPlaceholder}
      flex={1}
      px="$pagePadding"
      py="$10"
    >
      <Empty
        icon="GiftOutline"
        title={intl.formatMessage({
          id: ETranslations.activity_hub_my_rewards__action,
        })}
      />
    </YStack>
  );
}
