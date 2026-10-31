// 70 matches the previous icon-plus-two-line-label estimate.
// 52 is the 40px icon slot plus the row's 12px vertical padding, without a label.
export const SIDEBAR_TAB_ITEM_HEIGHT_WITH_LABEL = 70;
export const SIDEBAR_TAB_ITEM_HEIGHT_ICON_ONLY = 52;

export function resolveShowSidebarNavLabels(
  value: boolean | undefined,
): boolean {
  return value ?? false;
}

export function getSidebarTabItemEstimateHeight(showLabels: boolean): number {
  return showLabels
    ? SIDEBAR_TAB_ITEM_HEIGHT_WITH_LABEL
    : SIDEBAR_TAB_ITEM_HEIGHT_ICON_ONLY;
}

// 0 means the rail has not been measured, or is shorter than one item.
// The sidebar treats 0 as "show every tab" until a real height arrives.
export function getSidebarMaxVisibleTabCount(
  containerHeight: number,
  showLabels: boolean,
): number {
  if (containerHeight <= 0) {
    return 0;
  }
  return Math.floor(
    containerHeight / getSidebarTabItemEstimateHeight(showLabels),
  );
}

export function getSidebarTabLabel(
  options: {
    collapseTabBarLabel?: string;
    tabBarLabel?: unknown;
  },
  routeName: string,
): string {
  if (typeof options.collapseTabBarLabel === 'string') {
    return options.collapseTabBarLabel;
  }
  if (typeof options.tabBarLabel === 'string') {
    return options.tabBarLabel;
  }
  return routeName;
}
