import { ETranslationsMock } from './enum/translationsMock';

// Bundled locally until the navigation copy is uploaded to Lokalise.
const en = {
  [ETranslationsMock.sidebar_navigation_appearance__title]:
    'Navigation Tab Appearance',
  [ETranslationsMock.sidebar_navigation_show__title]: 'Show',
  [ETranslationsMock.sidebar_navigation_icons_and_text__label]:
    'Icons and text',
  [ETranslationsMock.sidebar_navigation_icons_only__label]: 'Icons only',
};

const zhCN: typeof en = {
  [ETranslationsMock.sidebar_navigation_appearance__title]: '导航标签外观',
  [ETranslationsMock.sidebar_navigation_show__title]: '显示',
  [ETranslationsMock.sidebar_navigation_icons_and_text__label]: '图标和文字',
  [ETranslationsMock.sidebar_navigation_icons_only__label]: '仅图标',
};

const zhTW: typeof en = {
  [ETranslationsMock.sidebar_navigation_appearance__title]: '導覽標籤外觀',
  [ETranslationsMock.sidebar_navigation_show__title]: '顯示',
  [ETranslationsMock.sidebar_navigation_icons_and_text__label]: '圖示和文字',
  [ETranslationsMock.sidebar_navigation_icons_only__label]: '僅圖示',
};

export function getSidebarNavigationMessages(locale: string) {
  if (locale === 'zh-CN') return zhCN;
  if (locale === 'zh-TW' || locale === 'zh-HK') return zhTW;
  return en;
}
