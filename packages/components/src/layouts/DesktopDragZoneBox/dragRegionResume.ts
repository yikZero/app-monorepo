import type { IDesktopAppState } from '@onekeyhq/shared/types/desktop';

const PAGE_RESUME_EVENT = 'resume';

function listen(
  target: EventTarget,
  type: string,
  listener: EventListener,
): () => void {
  target.addEventListener(type, listener);
  return () => {
    target.removeEventListener(type, listener);
  };
}

function subscribeDesktopAppState(onResume: () => void): () => void {
  const desktopApi = globalThis.desktopApi;
  if (!desktopApi?.onAppState) {
    return () => {};
  }
  return desktopApi.onAppState((state: IDesktopAppState) => {
    if (state === 'active') {
      onResume();
    }
  });
}

// Rebuild synthesized drag overlays when the window returns to the foreground.
// Overlay nodes can remain in the DOM after idle while Electron's native
// NSWindow region cache drops the no-drag holes (OK-63872). Re-attaching on
// resume refreshes that cache before the next click; blur/background/hidden
// must not recompute.
export function subscribeDesktopDragResume(onResume: () => void): () => void {
  const cleanups: Array<() => void> = [subscribeDesktopAppState(onResume)];

  if (typeof document !== 'undefined') {
    cleanups.push(
      listen(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          onResume();
        }
      }),
    );
    cleanups.push(listen(document, PAGE_RESUME_EVENT, () => onResume()));
  }

  if (typeof globalThis.addEventListener === 'function') {
    cleanups.push(listen(globalThis, 'focus', () => onResume()));
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
