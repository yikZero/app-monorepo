import type { ReactElement } from 'react';

import { YStack } from '@onekeyhq/components/src/primitives';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { MIN_SIDEBAR_WIDTH } from '@onekeyhq/components/src/utils/sidebar';

// Height to align with primary menu header (Mac drag area or logo area)
const HEADER_ALIGNMENT_HEIGHT = 52;
const EXPANDED_SUBMENU_WIDTH = 200;

export interface ISubmenuColumnProps {
  webPageTabBar: ReactElement;
  isExpanded?: boolean;
}

export function SubmenuColumn({
  webPageTabBar,
  isExpanded = false,
}: ISubmenuColumnProps) {
  // Desktop platforms have header space (Mac: drag area, Windows/Linux: logo)
  // iPad has no header space
  const shouldAddTopSpace = platformEnv.isDesktop;

  return (
    <YStack
      width={isExpanded ? EXPANDED_SUBMENU_WIDTH : MIN_SIDEBAR_WIDTH - 10}
      bg="$bgSidebar"
      pt={12}
      px={isExpanded ? '$6' : undefined}
      alignItems={isExpanded ? undefined : 'center'}
      flex={1}
      animation="quick"
    >
      {shouldAddTopSpace ? <YStack height={HEADER_ALIGNMENT_HEIGHT} /> : null}
      {webPageTabBar}
    </YStack>
  );
}
