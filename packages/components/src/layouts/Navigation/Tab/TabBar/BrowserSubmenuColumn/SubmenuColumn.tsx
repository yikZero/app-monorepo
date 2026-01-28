import type { ReactElement } from 'react';

import { Stack, YStack } from '@onekeyhq/components/src/primitives';
import { MIN_SIDEBAR_WIDTH } from '@onekeyhq/components/src/utils/sidebar';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

// Height to align with primary menu header (Mac drag area or logo area)
const HEADER_ALIGNMENT_HEIGHT = 52;
const EXPANDED_SUBMENU_WIDTH = 208;
const COLLAPSED_SUBMENU_WIDTH = MIN_SIDEBAR_WIDTH - 10;

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
    <Stack width={COLLAPSED_SUBMENU_WIDTH} flex={1}>
      {/* Overlay that expands on hover */}
      <YStack
        position="absolute"
        top={shouldAddTopSpace ? HEADER_ALIGNMENT_HEIGHT : 0}
        left={0}
        bottom={0}
        width={isExpanded ? EXPANDED_SUBMENU_WIDTH : COLLAPSED_SUBMENU_WIDTH}
        bg={isExpanded ? '$bgApp' : '$bgSidebar'}
        pt={8}
        px="$3"
        zIndex={10}
        animation="quick"
        borderTopRightRadius={isExpanded ? '$3' : 0}
        borderBottomRightRadius={isExpanded ? '$3' : 0}
        borderTopWidth={1}
        borderBottomWidth={1}
        borderRightWidth={1}
        borderColor={isExpanded ? '$neutral3' : 'transparent'}
        style={{
          boxShadow: isExpanded
            ? '10px 0 30px -10px rgba(0, 0, 0, 0.10)'
            : 'none',
        }}
      >
        {webPageTabBar}
      </YStack>
    </Stack>
  );
}
