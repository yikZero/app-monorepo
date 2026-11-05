import {
  resolveSidebarNavigationAppearance,
  supportsSidebarNavigationAppearance,
} from './sidebarNavigationAppearance';

describe('sidebar navigation appearance', () => {
  it('keeps labels for pre-existing settings without a preference', () => {
    expect(resolveSidebarNavigationAppearance()).toBe('icons-and-text');
    expect(resolveSidebarNavigationAppearance('icons-and-text')).toBe(
      'icons-and-text',
    );
    expect(resolveSidebarNavigationAppearance('icons-only')).toBe('icons-only');
  });

  it.each([
    [true, false, false, false, true],
    [false, true, false, true, true],
    [false, true, true, true, false],
    [false, true, false, false, false],
    [false, false, false, true, false],
  ])(
    'gates desktop=%s web=%s touch=%s hover=%s to %s',
    (isDesktop, isWeb, isTouchable, canHover, expected) => {
      expect(
        supportsSidebarNavigationAppearance({
          isDesktop,
          isWeb,
          isTouchable,
          canHover,
        }),
      ).toBe(expected);
    },
  );
});
