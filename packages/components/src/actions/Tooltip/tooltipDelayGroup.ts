// Tooltips that share a delay group open after a short delay on the first
// hover. While one of them is open, or shortly after it closed, moving onto
// another member opens it immediately: the user is scanning labels.
export const TOOLTIP_GROUP_OPEN_DELAY_MS = 400;
export const TOOLTIP_GROUP_SKIP_DELAY_MS = 300;

type IDelayGroupState = {
  openCount: number;
  lastClosedAt: number;
};

const groups = new Map<string, IDelayGroupState>();

function getGroup(name: string) {
  let group = groups.get(name);
  if (!group) {
    group = { openCount: 0, lastClosedAt: 0 };
    groups.set(name, group);
  }
  return group;
}

export function isTooltipDelayGroupWarm(name: string) {
  const group = groups.get(name);
  if (!group) return false;
  return (
    group.openCount > 0 ||
    Date.now() - group.lastClosedAt < TOOLTIP_GROUP_SKIP_DELAY_MS
  );
}

export function markTooltipDelayGroupOpen(name: string): () => void {
  const group = getGroup(name);
  group.openCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    group.openCount = Math.max(0, group.openCount - 1);
    group.lastClosedAt = Date.now();
  };
}

export function resetTooltipDelayGroupsForTest() {
  groups.clear();
}
