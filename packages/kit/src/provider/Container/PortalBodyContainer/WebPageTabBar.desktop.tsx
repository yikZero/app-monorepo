import { useMedia } from '@onekeyhq/components';

import DesktopCustomTabBar from '../../../views/Discovery/pages/DesktopCustomTabBar';

export function WebPageTabBar({
  isCollapsedOverride,
}: {
  isCollapsedOverride?: boolean;
}) {
  const { gtMd } = useMedia();
  if (!gtMd) {
    return null;
  }
  return <DesktopCustomTabBar isCollapsedOverride={isCollapsedOverride} />;
}
