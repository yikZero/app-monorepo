import { createContext, useContext } from 'react';

export type ISidebarAppearance = {
  enabled: boolean;
  showLabels: boolean;
  setShowLabels: (showLabels: boolean) => Promise<void>;
  showLabelsMenuText: string;
};

export const SidebarAppearanceContext = createContext<
  ISidebarAppearance | undefined
>(undefined);

export function useSidebarIconsOnly() {
  const appearance = useContext(SidebarAppearanceContext);
  return Boolean(appearance?.enabled && !appearance.showLabels);
}
