import type { ReactNode } from 'react';

import { YStack } from '@onekeyhq/components';

import { LaserBorder } from '../SignatureConfirmComponents/LaserBorder';

const OUTER_RADIUS = 12;
const AMBIENT_SHADOW_OFFSET = { width: 0, height: 8 };
const DIRECT_SHADOW_OFFSET = { width: 0, height: 1 };

export function ConfirmCardFrame({
  children,
  glow = false,
  onLaserAnimationComplete,
}: {
  children: ReactNode;
  glow?: boolean;
  // Fires once after the glow fade finishes. Skipped animations do not fire.
  onLaserAnimationComplete?: () => void;
}) {
  const card = (
    <LaserBorder
      borderRadius={OUTER_RADIUS}
      glow={glow}
      borderColor="$neutral4"
      onAnimationComplete={onLaserAnimationComplete}
    >
      {children}
    </LaserBorder>
  );

  // A glowing LaserBorder paints its own edge and native colored shadow.
  // Extra elevation wrappers clip that sweep, so skip them while glowing.
  if (glow) {
    return card;
  }

  return (
    <YStack
      borderRadius={OUTER_RADIUS}
      shadowColor="$shadowColor"
      shadowOffset={AMBIENT_SHADOW_OFFSET}
      shadowOpacity={0.08}
      shadowRadius={16}
    >
      <YStack
        borderRadius={OUTER_RADIUS}
        shadowColor="$shadowColor"
        shadowOffset={DIRECT_SHADOW_OFFSET}
        shadowOpacity={0.06}
        shadowRadius={3}
        elevation={2}
      >
        {card}
      </YStack>
    </YStack>
  );
}
