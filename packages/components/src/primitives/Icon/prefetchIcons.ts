import { I18nManager } from 'react-native';

import { resolveIconName } from './Icons';

import type { IKeyOfIcons } from './Icons';

// Web icons load their SVG resource on first render, so swapping to an icon
// that has not been shown yet (e.g. outline -> solid on selection) paints
// blank for a few frames. A hidden <use> per prefetched icon keeps the
// resource loaded, and later renders reuse it immediately.
const prefetchedNames = new Set<string>();
let host: HTMLDivElement | undefined;

function getHost() {
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    // Not display:none, so the browser still loads the referenced resources.
    host.style.cssText =
      'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(host);
  }
  return host;
}

export async function prefetchIcons(names: (IKeyOfIcons | undefined)[]) {
  if (typeof document === 'undefined') return;
  const pending = names
    .filter((name): name is IKeyOfIcons => Boolean(name))
    .map((name) => resolveIconName(name, I18nManager.isRTL))
    .filter((name) => !prefetchedNames.has(name));
  if (!pending.length) return;
  pending.forEach((name) => prefetchedNames.add(name));
  try {
    // Loaded lazily: only needed once something asks for a prefetch.
    const { createNamedIcon } =
      await import('@onekeyfe/react-native-image/icon/dom');
    const container = getHost();
    pending.forEach((name) => {
      container.appendChild(createNamedIcon(document, name));
    });
  } catch {
    // Best effort; let a later call retry.
    pending.forEach((name) => prefetchedNames.delete(name));
  }
}
