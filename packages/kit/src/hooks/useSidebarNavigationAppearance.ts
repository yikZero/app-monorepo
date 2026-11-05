import { useCallback, useEffect, useMemo, useState } from 'react';

import { useIntl } from 'react-intl';

import { useMedia } from '@onekeyhq/components';
import { useSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslationsMock } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  resolveSidebarNavigationAppearance,
  supportsSidebarNavigationAppearance,
} from '@onekeyhq/shared/src/utils/sidebarNavigationAppearance';
import type { ISidebarNavigationAppearance } from '@onekeyhq/shared/src/utils/sidebarNavigationAppearance';

import backgroundApiProxy from '../background/instance/backgroundApiProxy';

export function useSidebarNavigationAppearance() {
  const intl = useIntl();
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
  const value = resolveSidebarNavigationAppearance(sidebarNavigationAppearance);
  const onChange = useCallback(async (next: ISidebarNavigationAppearance) => {
    await backgroundApiProxy.serviceSetting.setSidebarNavigationAppearance(
      next,
    );
  }, []);
  return useMemo(
    () => ({
      enabled,
      value,
      onChange,
      title: intl.formatMessage({
        id: ETranslationsMock.sidebar_navigation_appearance__title,
      }),
      showLabel: intl.formatMessage({
        id: ETranslationsMock.sidebar_navigation_show__title,
      }),
      options: [
        {
          value: 'icons-and-text' as const,
          label: intl.formatMessage({
            id: ETranslationsMock.sidebar_navigation_icons_and_text__label,
          }),
        },
        {
          value: 'icons-only' as const,
          label: intl.formatMessage({
            id: ETranslationsMock.sidebar_navigation_icons_only__label,
          }),
        },
      ],
    }),
    [enabled, value, onChange, intl],
  );
}
