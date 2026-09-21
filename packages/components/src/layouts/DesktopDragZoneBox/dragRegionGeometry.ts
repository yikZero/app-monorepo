export type IDragRegionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function roundDragRegionRect(rect: IDragRegionRect): IDragRegionRect {
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function intersectRects(
  a: IDragRegionRect,
  b: IDragRegionRect,
): IDragRegionRect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const width = Math.min(a.left + a.width, b.left + b.width) - left;
  const height = Math.min(a.top + a.height, b.top + b.height) - top;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { left, top, width, height };
}

function subtractOneRect(
  rect: IDragRegionRect,
  hole: IDragRegionRect,
): IDragRegionRect[] {
  const hit = intersectRects(rect, hole);
  if (!hit) {
    return [rect];
  }
  const rectRight = rect.left + rect.width;
  const rectBottom = rect.top + rect.height;
  const hitRight = hit.left + hit.width;
  const hitBottom = hit.top + hit.height;
  const pieces: IDragRegionRect[] = [];
  if (hit.top > rect.top) {
    pieces.push({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: hit.top - rect.top,
    });
  }
  if (hitBottom < rectBottom) {
    pieces.push({
      left: rect.left,
      top: hitBottom,
      width: rect.width,
      height: rectBottom - hitBottom,
    });
  }
  if (hit.left > rect.left) {
    pieces.push({
      left: rect.left,
      top: hit.top,
      width: hit.left - rect.left,
      height: hit.height,
    });
  }
  if (hitRight < rectRight) {
    pieces.push({
      left: hitRight,
      top: hit.top,
      width: rectRight - hitRight,
      height: hit.height,
    });
  }
  return pieces;
}

// Drag overlays must cover only the empty remainder of a zone. A full-zone
// drag plus no-drag holes fails after idle: Chromium/Electron can drop the
// holes and keep the drag, so header controls (address bar, refresh) stop
// receiving clicks until a resize rebuilds the native region (OK-63872).
export function subtractRects(
  zone: IDragRegionRect,
  holes: IDragRegionRect[],
): IDragRegionRect[] {
  if (zone.width <= 0 || zone.height <= 0) {
    return [];
  }
  let remaining: IDragRegionRect[] = [zone];
  for (const hole of holes) {
    remaining = remaining.flatMap((rect) => subtractOneRect(rect, hole));
    if (remaining.length === 0) {
      break;
    }
  }
  return remaining;
}
