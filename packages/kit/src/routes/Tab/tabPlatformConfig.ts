import type { IKeyOfIcons } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { ETabRoutes } from '@onekeyhq/shared/src/routes/tab';

// Shared by the tab router and features that switch to a tab (e.g. the Action
// Center recent list), so both show the same label, icon and availability.

export const DISCOVER_TAB_TRANSLATION_ID = platformEnv.isNative
  ? ETranslations.global_discover
  : ETranslations.global_browser;

type IMainTabMeta = {
  translationId: ETranslations;
  outlineIcon: IKeyOfIcons;
  solidIcon: IKeyOfIcons;
};

export const MAIN_TAB_META = {
  [ETabRoutes.Market]: {
    translationId: ETranslations.global_market,
    outlineIcon: 'TradingViewCandlesOutline',
    solidIcon: 'TradingViewCandlesSolid',
  },
  [ETabRoutes.Swap]: {
    translationId: ETranslations.global_trade,
    outlineIcon: 'SwitchHorOutline',
    solidIcon: 'SwitchHorSolid',
  },
  // Used by both perp tabs (native and webview).
  [ETabRoutes.Perp]: {
    translationId: ETranslations.global_perp,
    outlineIcon: 'TradeOutline',
    solidIcon: 'TradeSolid',
  },
  [ETabRoutes.Earn]: {
    translationId: ETranslations.global_earn,
    outlineIcon: 'CoinsOutline',
    solidIcon: 'CoinsSolid',
  },
  [ETabRoutes.Discovery]: {
    translationId: DISCOVER_TAB_TRANSLATION_ID,
    outlineIcon: 'CompassOutline',
    solidIcon: 'CompassSolid',
  },
} satisfies Partial<Record<ETabRoutes, IMainTabMeta>>;

export function getPerpTabRoute({
  perpTabShowWeb,
}: {
  perpTabShowWeb?: boolean;
}) {
  return perpTabShowWeb ? ETabRoutes.WebviewPerpTrade : ETabRoutes.Perp;
}

/** Which optional main tabs exist on the current platform. */
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
  };
}
