import { ETranslationsMock } from './enum/translationsMock';
import { getSidebarNavigationMessages } from './sidebarNavigationMessages';

describe('bundled sidebar navigation copy', () => {
  const key = ETranslationsMock.sidebar_navigation_icons_only__label;
  it('provides English and both Chinese variants', () => {
    expect(getSidebarNavigationMessages('en-US')[key]).toBe('Icons only');
    expect(getSidebarNavigationMessages('zh-CN')[key]).toBe('仅图标');
    expect(getSidebarNavigationMessages('zh-TW')[key]).toBe('僅圖示');
    expect(getSidebarNavigationMessages('zh-HK')[key]).toBe('僅圖示');
  });
  it('falls back to English for other locales', () => {
    expect(getSidebarNavigationMessages('de')[key]).toBe('Icons only');
  });
});
