export type ISidebarNavigationAppearance = 'icons-and-text' | 'icons-only';

export function resolveSidebarNavigationAppearance(
  value?: ISidebarNavigationAppearance,
): ISidebarNavigationAppearance {
  return value === 'icons-only' ? 'icons-only' : 'icons-and-text';
}

export function supportsSidebarNavigationAppearance({
  isDesktop,
  isWeb,
  isTouchable,
  canHover,
}: {
  isDesktop: boolean;
  isWeb: boolean;
  isTouchable: boolean;
  canHover: boolean;
}) {
  return isDesktop || (isWeb && !isTouchable && canHover);
}
