import { createContext, useContext } from 'react';

import type { ISidebarNavigationAppearance } from '@onekeyhq/shared/src/utils/sidebarNavigationAppearance';

export type ISidebarAppearance = {
  enabled: boolean;
  value: ISidebarNavigationAppearance;
  onChange: (value: ISidebarNavigationAppearance) => Promise<void>;
  showLabel: string;
  options: { value: ISidebarNavigationAppearance; label: string }[];
};

export const SidebarAppearanceContext = createContext<
  ISidebarAppearance | undefined
>(undefined);

export function useSidebarIconsOnly() {
  const appearance = useContext(SidebarAppearanceContext);
  return appearance?.enabled && appearance.value === 'icons-only';
}
