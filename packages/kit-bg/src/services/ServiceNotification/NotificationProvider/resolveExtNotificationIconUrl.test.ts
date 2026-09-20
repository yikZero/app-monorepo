import { BLANK_ICON_BASE64 } from '@onekeyhq/shared/src/consts';

import {
  EXT_NOTIFICATION_DEFAULT_ICON_PATH,
  resolveExtNotificationIconUrl,
} from './resolveExtNotificationIconUrl';

const EXTENSION_ORIGIN = 'chrome-extension://onekey-test-id';
const packagedIconUrl = `${EXTENSION_ORIGIN}/${EXT_NOTIFICATION_DEFAULT_ICON_PATH}`;

function getExtensionUrl(path: string) {
  return `${EXTENSION_ORIGIN}/${path}`;
}

describe('resolveExtNotificationIconUrl', () => {
  it('keeps a payload icon when present', () => {
    expect(
      resolveExtNotificationIconUrl({
        icon: 'https://uni.onekey-asset.com/static/token.png',
        getExtensionUrl,
      }),
    ).toBe('https://uni.onekey-asset.com/static/token.png');
  });

  it('uses the packaged OneKey icon when the payload has no usable icon', () => {
    expect(resolveExtNotificationIconUrl({ getExtensionUrl })).toBe(
      packagedIconUrl,
    );
    expect(resolveExtNotificationIconUrl({ icon: '', getExtensionUrl })).toBe(
      packagedIconUrl,
    );
    expect(resolveExtNotificationIconUrl({ getExtensionUrl })).not.toBe(
      BLANK_ICON_BASE64,
    );
  });

  it('reads the packaged icon from chrome.runtime.getURL by default', () => {
    const originalChrome = globalThis.chrome;
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        runtime: {
          getURL: (path: string) => `${EXTENSION_ORIGIN}/${path}`,
        },
      },
    });
    try {
      expect(resolveExtNotificationIconUrl()).toBe(packagedIconUrl);
    } finally {
      Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: originalChrome,
      });
    }
  });
});
