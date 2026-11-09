import platformEnv from '@onekeyhq/shared/src/platformEnv';

// Hiding labels relies on hover tooltips, so it needs a mouse-like pointer.
export const isSidebarLabelsToggleSupported: boolean =
  Boolean(platformEnv.isDesktop) ||
  (Boolean(platformEnv.isWeb) &&
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(hover: hover) and (pointer: fine)').matches);
