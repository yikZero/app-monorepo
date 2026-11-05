/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

import { useMedia } from '@onekeyhq/components';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { useSupportsSidebarLabelHover } from './useSupportsSidebarLabelHover';

jest.mock('@onekeyhq/components', () => ({ useMedia: jest.fn() }));
jest.mock('@onekeyhq/shared/src/platformEnv', () => ({
  __esModule: true,
  default: {
    isNative: false,
    isDesktop: false,
    isWeb: false,
    isExtension: false,
    isExtensionUiPopup: false,
    isExtensionUiSidePanel: false,
  },
}));

const mockedPlatformEnv = platformEnv as {
  isNative: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  isExtension: boolean;
  isExtensionUiPopup: boolean;
  isExtensionUiSidePanel: boolean;
};
const mockedUseMedia = jest.mocked(useMedia);

function setMedia(hoverNone: boolean, pointerCoarse: boolean) {
  mockedUseMedia.mockReturnValue({
    hoverNone,
    pointerCoarse,
  } as ReturnType<typeof useMedia>);
}

describe('useSupportsSidebarLabelHover', () => {
  beforeEach(() => {
    Object.assign(mockedPlatformEnv, {
      isNative: false,
      isDesktop: false,
      isWeb: false,
      isExtension: false,
      isExtensionUiPopup: false,
      isExtensionUiSidePanel: false,
    });
    setMedia(false, false);
  });

  it('keeps labels on native tablets even with mouse media capabilities', () => {
    mockedPlatformEnv.isNative = true;
    const { result } = renderHook(useSupportsSidebarLabelHover);
    expect(result.current).toBe(false);
  });

  it('supports desktop even when Chromium reports no hover and a coarse pointer', () => {
    mockedPlatformEnv.isDesktop = true;
    setMedia(true, true);
    const { result } = renderHook(useSupportsSidebarLabelHover);
    expect(result.current).toBe(true);
  });

  it.each(['isWeb', 'isExtension'] as const)(
    'responds to hover and pointer changes on %s',
    (platform) => {
      mockedPlatformEnv[platform] = true;
      const { result, rerender } = renderHook(useSupportsSidebarLabelHover);
      expect(result.current).toBe(true);

      setMedia(true, false);
      rerender();
      expect(result.current).toBe(false);

      setMedia(false, true);
      rerender();
      expect(result.current).toBe(false);

      setMedia(false, false);
      rerender();
      expect(result.current).toBe(true);
    },
  );

  it.each(['isExtensionUiPopup', 'isExtensionUiSidePanel'] as const)(
    'hides the preference on %s because it uses bottom tabs',
    (surface) => {
      mockedPlatformEnv.isExtension = true;
      mockedPlatformEnv[surface] = true;
      const { result } = renderHook(useSupportsSidebarLabelHover);
      expect(result.current).toBe(false);
    },
  );

  it('does not enable the feature on other runtimes', () => {
    const { result } = renderHook(useSupportsSidebarLabelHover);
    expect(result.current).toBe(false);
  });
});
