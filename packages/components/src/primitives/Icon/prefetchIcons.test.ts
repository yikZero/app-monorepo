/**
 * @jest-environment jsdom
 */

import { prefetchIcons } from './prefetchIcons';

jest.mock('react-native', () => ({ I18nManager: { isRTL: false } }));

jest.mock('@onekeyfe/react-native-image/icon/dom', () => ({
  createNamedIcon: (doc: Document, name: string) => {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-name', name);
    return svg;
  },
}));

function prefetchedNames() {
  return Array.from(document.querySelectorAll('svg[data-name]')).map((node) =>
    node.getAttribute('data-name'),
  );
}

describe('prefetchIcons', () => {
  it('mounts each icon once in a hidden host that still loads resources', async () => {
    await prefetchIcons(['WalletSolid', 'WalletOutline', undefined]);
    await prefetchIcons(['WalletSolid']);

    expect(prefetchedNames()).toEqual(['WalletSolid', 'WalletOutline']);
    const host = document.querySelector('svg[data-name]')
      ?.parentElement as HTMLElement;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.style.display).not.toBe('none');
  });
});
