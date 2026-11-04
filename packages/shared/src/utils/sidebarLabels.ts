import platformEnv from '../platformEnv';

export function supportsSidebarLabelHover(): boolean {
  if (platformEnv.isDesktop) {
    return true;
  }
  return Boolean(
    platformEnv.isWeb &&
    !platformEnv.isWebTouchable &&
    !platformEnv.isWebMobile &&
    globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches,
  );
}
