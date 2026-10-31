import {
  SIDEBAR_TAB_ITEM_HEIGHT_ICON_ONLY,
  SIDEBAR_TAB_ITEM_HEIGHT_WITH_LABEL,
  getSidebarMaxVisibleTabCount,
  getSidebarTabItemEstimateHeight,
  getSidebarTabLabel,
  resolveShowSidebarNavLabels,
} from './sidebarNavLabels';

describe('resolveShowSidebarNavLabels', () => {
  it('hides labels when the saved preference is missing', () => {
    expect(resolveShowSidebarNavLabels(undefined)).toBe(false);
  });

  it('hides labels when the preference is off', () => {
    expect(resolveShowSidebarNavLabels(false)).toBe(false);
  });

  it('shows labels when the preference is on', () => {
    expect(resolveShowSidebarNavLabels(true)).toBe(true);
  });
});

describe('getSidebarTabItemEstimateHeight', () => {
  it('uses the shorter row when labels are hidden', () => {
    expect(getSidebarTabItemEstimateHeight(false)).toBe(
      SIDEBAR_TAB_ITEM_HEIGHT_ICON_ONLY,
    );
    expect(SIDEBAR_TAB_ITEM_HEIGHT_ICON_ONLY).toBe(52);
  });

  it('keeps the labeled row height when labels are shown', () => {
    expect(getSidebarTabItemEstimateHeight(true)).toBe(
      SIDEBAR_TAB_ITEM_HEIGHT_WITH_LABEL,
    );
    expect(SIDEBAR_TAB_ITEM_HEIGHT_WITH_LABEL).toBe(70);
  });
});

describe('getSidebarMaxVisibleTabCount', () => {
  it('returns 0 before the rail has a height', () => {
    expect(getSidebarMaxVisibleTabCount(0, false)).toBe(0);
    expect(getSidebarMaxVisibleTabCount(-1, true)).toBe(0);
  });

  it('fits more icons in the same rail after labels are hidden', () => {
    const height = 700;
    const withLabels = getSidebarMaxVisibleTabCount(height, true);
    const iconOnly = getSidebarMaxVisibleTabCount(height, false);

    expect(withLabels).toBe(10);
    expect(iconOnly).toBe(13);
    expect(iconOnly).toBeGreaterThan(withLabels);
  });
});

describe('getSidebarTabLabel', () => {
  it('prefers the collapsed sidebar label', () => {
    expect(
      getSidebarTabLabel(
        { collapseTabBarLabel: 'Swap', tabBarLabel: 'Trade' },
        'SwapRoute',
      ),
    ).toBe('Swap');
  });

  it('uses a string tab label', () => {
    expect(getSidebarTabLabel({ tabBarLabel: 'Wallet' }, 'Home')).toBe(
      'Wallet',
    );
  });

  it('keeps an empty string label', () => {
    expect(getSidebarTabLabel({ tabBarLabel: '' }, 'Home')).toBe('');
  });

  it('falls back to the route name when the label is not a string', () => {
    expect(getSidebarTabLabel({ tabBarLabel: () => null }, 'Market')).toBe(
      'Market',
    );
  });
});
