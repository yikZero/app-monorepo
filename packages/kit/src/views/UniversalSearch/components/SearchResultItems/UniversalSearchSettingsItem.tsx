import { useCallback } from 'react';

import type { IKeyOfIcons } from '@onekeyhq/components';
import { Icon, SizableText } from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { useUniversalSearchActions } from '@onekeyhq/kit/src/states/jotai/contexts/universalSearch';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EModalSettingRoutes } from '@onekeyhq/shared/src/routes/setting';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import type { IUniversalSearchSettings } from '@onekeyhq/shared/types/search';

interface IUniversalSearchSettingsItemProps {
  item: IUniversalSearchSettings;
}

export function UniversalSearchSettingsItem({
  item,
}: IUniversalSearchSettingsItemProps) {
  const navigation = useAppNavigation();
  const universalSearchActions = useUniversalSearchActions();
  const { title, icon, sectionTitle, settingRoute, onPress } = item.payload;

  const handlePress = useCallback(async () => {
    navigation.pop();
    await timerUtils.wait(300);

    if (settingRoute) {
      navigation.pushModal(EModalRoutes.SettingModal, {
        screen: settingRoute,
      });
    } else if (onPress) {
      onPress(navigation);
    } else {
      navigation.pushModal(EModalRoutes.SettingModal, {
        screen: EModalSettingRoutes.SettingListModal,
      });
    }

    await timerUtils.wait(10);
    universalSearchActions.current.addIntoRecentSearchList({
      id: `settings-${settingRoute ?? title}`,
      text: title,
      type: item.type,
      timestamp: Date.now(),
      extra: {
        sectionTitle,
        settingRoute: settingRoute ?? '',
      },
    });
  }, [
    navigation,
    settingRoute,
    onPress,
    universalSearchActions,
    title,
    sectionTitle,
    item.type,
  ]);

  return (
    <ListItem onPress={handlePress}>
      <Icon name={icon as IKeyOfIcons} size="$6" color="$iconSubdued" />
      <ListItem.Text
        flex={1}
        primary={title}
        secondary={
          <SizableText size="$bodyMd" color="$textSubdued">
            {sectionTitle}
          </SizableText>
        }
      />
    </ListItem>
  );
}
