import { useCallback } from 'react';

import { ESwitchSize, Switch, startViewTransition } from '@onekeyhq/components';
import { useSidebarNavigationAppearance } from '@onekeyhq/kit/src/hooks/useSidebarNavigationAppearance';

import { TabSettingsListItem } from './ListItem';
import {
  logSettingValueChanged,
  maybeLogSettingsSearchResultClick,
} from './settingsAnalytics';

import type { ICustomElementProps } from './CustomElement';

export function SidebarAppearanceListItem({
  logItemClick,
  analyticsSource,
  ...props
}: ICustomElementProps) {
  const { showLabels, setShowLabels } = useSidebarNavigationAppearance();
  const handleChange = useCallback(
    (value: boolean) => {
      maybeLogSettingsSearchResultClick({
        source: analyticsSource,
        logItemClick,
      });
      logSettingValueChanged({
        itemId: 'sidebar-labels',
        from: String(showLabels),
        to: String(value),
      });
      startViewTransition(() => {
        void setShowLabels(value);
      });
    },
    [analyticsSource, logItemClick, setShowLabels, showLabels],
  );
  return (
    <TabSettingsListItem {...props} userSelect="none">
      <Switch
        testID="settings-sidebar-labels-switch"
        size={ESwitchSize.small}
        value={showLabels}
        onChange={handleChange}
      />
    </TabSettingsListItem>
  );
}
