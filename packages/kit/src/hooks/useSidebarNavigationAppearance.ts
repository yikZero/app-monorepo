import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMedia } from '@onekeyhq/components';
import type { ISidebarAppearance } from '@onekeyhq/components/src/layouts/Navigation/Tab/TabBar/SidebarAppearanceContext';
import { useSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  resolveSidebarNavigationAppearance,
  supportsSidebarNavigationAppearance,
} from '@onekeyhq/shared/src/utils/sidebarNavigationAppearance';

import backgroundApiProxy from '../background/instance/backgroundApiProxy';

// Hardcoded English until the copy is added to Lokalise.
export const SIDEBAR_LABELS_COPY = {
  settingTitle: 'Show sidebar labels',
  settingDescription: 'Show text under each sidebar icon',
  menuItem: 'Show labels',
} as const;

export function useSidebarNavigationAppearance(): ISidebarAppearance & {
  settingTitle: string;
  settingDescription: string;
} {
  const { gtMd } = useMedia();
  const [{ sidebarNavigationAppearance }] = useSettingsPersistAtom();
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (!platformEnv.isWeb || typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const media = globalThis.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const enabled =
    gtMd &&
    supportsSidebarNavigationAppearance({
      isDesktop: Boolean(platformEnv.isDesktop),
      isWeb: Boolean(platformEnv.isWeb),
      isTouchable: Boolean(platformEnv.isWebTouchable),
      canHover,
    });
  const showLabels =
    resolveSidebarNavigationAppearance(sidebarNavigationAppearance) ===
    'icons-and-text';
  const setShowLabels = useCallback(async (next: boolean) => {
    await backgroundApiProxy.serviceSetting.setSidebarNavigationAppearance(
      next ? 'icons-and-text' : 'icons-only',
    );
  }, []);
  return useMemo(
    () => ({
      enabled,
      showLabels,
      setShowLabels,
      showLabelsMenuText: SIDEBAR_LABELS_COPY.menuItem,
      settingTitle: SIDEBAR_LABELS_COPY.settingTitle,
      settingDescription: SIDEBAR_LABELS_COPY.settingDescription,
    }),
    [enabled, showLabels, setShowLabels],
  );
}
