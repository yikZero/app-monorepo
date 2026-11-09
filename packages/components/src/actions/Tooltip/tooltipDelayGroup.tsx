import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

// Tooltips inside a group wait before the first one opens. While one of them
// is open, or shortly after it closed, moving onto another opens it
// immediately: the user is scanning labels.
export const TOOLTIP_GROUP_OPEN_DELAY_MS = 400;
export const TOOLTIP_GROUP_SKIP_DELAY_MS = 300;

export interface ITooltipDelayGroup {
  isWarm: () => boolean;
  markOpen: () => () => void;
}

export function createTooltipDelayGroup(): ITooltipDelayGroup {
  let openCount = 0;
  let lastClosedAt = 0;
  return {
    isWarm: () =>
      openCount > 0 || Date.now() - lastClosedAt < TOOLTIP_GROUP_SKIP_DELAY_MS,
    markOpen: () => {
      openCount += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        openCount -= 1;
        lastClosedAt = Date.now();
      };
    },
  };
}

const TooltipDelayGroupContext = createContext<ITooltipDelayGroup | undefined>(
  undefined,
);

export function TooltipDelayGroup({ children }: { children: ReactNode }) {
  const group = useMemo(createTooltipDelayGroup, []);
  return (
    <TooltipDelayGroupContext.Provider value={group}>
      {children}
    </TooltipDelayGroupContext.Provider>
  );
}

export function useTooltipDelayGroup() {
  return useContext(TooltipDelayGroupContext);
}
