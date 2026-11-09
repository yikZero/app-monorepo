import platformEnv from '@onekeyhq/shared/src/platformEnv';

// Hardcoded English until the copy is added to Lokalise.
export const SIDEBAR_LABELS_SETTING_COPY = {
  title: 'Show sidebar labels',
  description:
    'Show names under sidebar icons. When off, hover an icon to see its name.',
} as const;

// Only where the left sidebar exists: desktop, and web in wallet mode (dapp
// mode has no sidebar). Hiding labels relies on hover tooltips, so web also
// needs a mouse-like pointer.
export const isSidebarLabelsToggleSupported: boolean =
  Boolean(platformEnv.isDesktop) ||
  (Boolean(platformEnv.isWeb) &&
    !platformEnv.isWebDappMode &&
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(hover: hover) and (pointer: fine)').matches);
