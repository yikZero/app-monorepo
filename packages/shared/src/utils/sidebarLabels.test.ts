/** @jest-environment jsdom */

import platformEnv from '../platformEnv';

import { supportsSidebarLabelHover } from './sidebarLabels';

jest.mock('../platformEnv', () => ({
  __esModule: true,
  default: {
    isDesktop: false,
    isWeb: false,
    isWebTouchable: false,
    isWebMobile: false,
  },
}));

const mockedPlatformEnv = platformEnv as {
  isDesktop: boolean;
  isWeb: boolean;
  isWebTouchable: boolean;
  isWebMobile: boolean;
};

describe('supportsSidebarLabelHover', () => {
  beforeEach(() => {
    mockedPlatformEnv.isDesktop = false;
    mockedPlatformEnv.isWeb = false;
    mockedPlatformEnv.isWebTouchable = false;
    mockedPlatformEnv.isWebMobile = false;
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({ matches: true }),
    });
  });

  it('supports desktop even when matchMedia does not report a mouse', () => {
    mockedPlatformEnv.isDesktop = true;
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    });
    expect(supportsSidebarLabelHover()).toBe(true);
  });

  it('supports web with a fine pointer and hover', () => {
    mockedPlatformEnv.isWeb = true;
    expect(supportsSidebarLabelHover()).toBe(true);
    expect(globalThis.matchMedia).toHaveBeenCalledWith(
      '(hover: hover) and (pointer: fine)',
    );
  });

  it('keeps labels on a coarse-pointer web device', () => {
    mockedPlatformEnv.isWeb = true;
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    });
    expect(supportsSidebarLabelHover()).toBe(false);
  });

  it('keeps labels on touch web, mobile web and native tablets', () => {
    mockedPlatformEnv.isWeb = true;
    mockedPlatformEnv.isWebTouchable = true;
    expect(supportsSidebarLabelHover()).toBe(false);
    mockedPlatformEnv.isWebTouchable = false;
    mockedPlatformEnv.isWebMobile = true;
    expect(supportsSidebarLabelHover()).toBe(false);
    mockedPlatformEnv.isWeb = false;
    mockedPlatformEnv.isWebMobile = false;
    expect(supportsSidebarLabelHover()).toBe(false);
  });

  it('keeps labels when matchMedia is unavailable', () => {
    mockedPlatformEnv.isWeb = true;
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
    expect(supportsSidebarLabelHover()).toBe(false);
  });
});
