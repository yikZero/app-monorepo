import { createContext, useContext } from 'react';

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
