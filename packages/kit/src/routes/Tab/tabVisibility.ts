import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

/**
 * Which optional main tabs exist on the current platform. Shared by the tab
 * router and features that switch to a tab, so both agree on availability.
 */
export function getTabVisibility({ md }: { md: boolean }) {
  const isExtensionPanel = Boolean(
    platformEnv.isExtensionUiPopup || platformEnv.isExtensionUiSidePanel,
  );
  const isShowDesktopDiscover = Boolean(platformEnv.isDesktop);
  const isShowMDDiscover =
    !isShowDesktopDiscover &&
    !platformEnv.isWebDappMode &&
    !platformEnv.isExtensionUiPopup &&
    !(platformEnv.isExtensionUiSidePanel && md);
  return {
    shouldShowMarketTab: !isExtensionPanel,
    // Mobile merges Market into Discovery, so its tab icon is hidden there.
    isMarketTabIconHidden: Boolean(platformEnv.isNative),
    isShowDesktopDiscover,
    isShowMDDiscover,
    discoverTranslationId: platformEnv.isNative
      ? ETranslations.global_discover
      : ETranslations.global_browser,
  };
}
