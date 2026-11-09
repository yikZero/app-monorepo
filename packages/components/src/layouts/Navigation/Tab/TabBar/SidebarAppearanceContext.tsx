import { createContext, useContext } from 'react';

// Hardcoded English until the copy is added to Lokalise.
export const SIDEBAR_LABELS_MENU_ITEM = 'Show labels';

export type ISidebarAppearance = {
  showLabels: boolean;
  setShowLabels: (showLabels: boolean) => Promise<void>;
};

// Provided only where the toggle is supported; absent means labels are shown.
export const SidebarAppearanceContext = createContext<
  ISidebarAppearance | undefined
>(undefined);

export function useSidebarIconsOnly() {
  const appearance = useContext(SidebarAppearanceContext);
  return appearance?.showLabels === false;
}
