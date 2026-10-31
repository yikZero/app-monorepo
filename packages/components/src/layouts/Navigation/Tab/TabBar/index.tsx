import type { ReactElement } from 'react';

import { useMedia } from '@onekeyhq/components/src/hooks/useStyle';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { DesktopLeftSideBar } from './DesktopLeftSideBar';
import MobileBottomTabBar from './MobileBottomTabBar';

import type { ITabNavigatorExtraConfig } from '../../Navigator/types';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const useShowMobileBottomTabBar = platformEnv.isNative
  ? () => true
  : () => {
      const media = useMedia();
      return media.md;
    };

export default function NavigationBar({
  showSidebarNavLabels,
  ...props
}: BottomTabBarProps & {
  extraConfig?: ITabNavigatorExtraConfig<string>;
  bottomMenu: ReactElement;
  webPageTabBar: ReactElement;
  showSidebarNavLabels?: boolean;
}) {
  const isShowMobileBottomTabBar = useShowMobileBottomTabBar();
  const { gtMd } = useMedia();

  if (platformEnv.isWebDappMode && gtMd) {
    return null;
  }

  if (isShowMobileBottomTabBar) {
    return <MobileBottomTabBar {...props} />;
  }
  return (
    <DesktopLeftSideBar
      {...props}
      showSidebarNavLabels={showSidebarNavLabels}
    />
  );
}
