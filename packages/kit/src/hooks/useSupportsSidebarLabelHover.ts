import { useMedia } from '@onekeyhq/components';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

export function useSupportsSidebarLabelHover(): boolean {
  const { hoverNone, pointerCoarse } = useMedia();
  if (platformEnv.isNative) {
    return false;
  }
  // Chromium on Linux desktop does not reliably report hover capability.
  if (platformEnv.isDesktop) {
    return true;
  }
  return Boolean(
    (platformEnv.isWeb || platformEnv.isExtension) &&
    !hoverNone &&
    !pointerCoarse,
  );
}
