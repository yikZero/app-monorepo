/**
 * @jest-environment jsdom
 */

import type { IDesktopAppState } from '@onekeyhq/shared/types/desktop';

import { subscribeDesktopDragResume } from './dragRegionResume';

const originalDesktopApi = globalThis.desktopApi;
const originalVisibility = Object.getOwnPropertyDescriptor(
  Document.prototype,
  'visibilityState',
);
const originalAddEventListener = globalThis.addEventListener;
const originalRemoveEventListener = globalThis.removeEventListener;

function mockDesktopApi() {
  const appStateListeners: Array<(state: IDesktopAppState) => void> = [];
  globalThis.desktopApi = {
    onAppState: (cb: (state: IDesktopAppState) => void) => {
      appStateListeners.push(cb);
      return () => {
        const index = appStateListeners.indexOf(cb);
        if (index >= 0) {
          appStateListeners.splice(index, 1);
        }
      };
    },
  } as typeof globalThis.desktopApi;
  return appStateListeners;
}

function setVisibilityState(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  });
}

function installFocusCapture() {
  let focusListener: ((event: Event) => void) | undefined;
  globalThis.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (type === 'focus' && typeof listener === 'function') {
      focusListener = listener;
    }
    originalAddEventListener.call(globalThis, type, listener, options);
  }) as typeof globalThis.addEventListener;
  globalThis.removeEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) => {
    if (type === 'focus' && listener === focusListener) {
      focusListener = undefined;
    }
    originalRemoveEventListener.call(globalThis, type, listener, options);
  }) as typeof globalThis.removeEventListener;
  return {
    runFocus: () => {
      focusListener?.(new Event('focus'));
    },
    hasFocusListener: () => typeof focusListener === 'function',
  };
}

afterEach(() => {
  globalThis.addEventListener = originalAddEventListener;
  globalThis.removeEventListener = originalRemoveEventListener;
  globalThis.desktopApi = originalDesktopApi;
  Reflect.deleteProperty(document, 'visibilityState');
  if (originalVisibility) {
    Object.defineProperty(
      Document.prototype,
      'visibilityState',
      originalVisibility,
    );
  }
});

describe('subscribeDesktopDragResume', () => {
  it('invokes resume on visible, focus, page resume, and app active', () => {
    const focusCapture = installFocusCapture();
    const appStateListeners = mockDesktopApi();
    const onResume = jest.fn();
    const unsubscribe = subscribeDesktopDragResume(onResume);

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onResume).toHaveBeenCalledTimes(1);

    expect(focusCapture.hasFocusListener()).toBe(true);
    focusCapture.runFocus();
    expect(onResume).toHaveBeenCalledTimes(2);

    document.dispatchEvent(new Event('resume'));
    expect(onResume).toHaveBeenCalledTimes(3);

    appStateListeners.forEach((cb) => cb('active'));
    expect(onResume).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it('does not invoke resume on hidden, blur, or background app state', () => {
    const appStateListeners = mockDesktopApi();
    const onResume = jest.fn();
    const unsubscribe = subscribeDesktopDragResume(onResume);

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    globalThis.dispatchEvent(new Event('blur'));
    appStateListeners.forEach((cb) => cb('background'));
    appStateListeners.forEach((cb) => cb('blur'));

    expect(onResume).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('does not invoke resume after unsubscribe', () => {
    const focusCapture = installFocusCapture();
    const appStateListeners = mockDesktopApi();
    const onResume = jest.fn();
    const unsubscribe = subscribeDesktopDragResume(onResume);
    unsubscribe();

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    focusCapture.runFocus();
    document.dispatchEvent(new Event('resume'));
    appStateListeners.forEach((cb) => cb('active'));

    expect(onResume).not.toHaveBeenCalled();
    expect(focusCapture.hasFocusListener()).toBe(false);
  });
});
