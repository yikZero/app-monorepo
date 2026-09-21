import { roundDragRegionRect, subtractRects } from './dragRegionGeometry';

import type { IDragRegionRect } from './dragRegionGeometry';

const zone: IDragRegionRect = { left: 0, top: 0, width: 100, height: 40 };

describe('subtractRects', () => {
  it('keeps the full zone when there are no holes', () => {
    expect(subtractRects(zone, [])).toEqual([zone]);
  });

  it('returns nothing when a hole covers the zone', () => {
    expect(
      subtractRects(zone, [{ left: 0, top: 0, width: 100, height: 40 }]),
    ).toEqual([]);
  });

  it('splits around a hole in the middle of the zone', () => {
    expect(
      subtractRects(zone, [{ left: 10, top: 0, width: 80, height: 40 }]),
    ).toEqual([
      { left: 0, top: 0, width: 10, height: 40 },
      { left: 90, top: 0, width: 10, height: 40 },
    ]);
  });

  it('keeps the gap between adjacent holes', () => {
    expect(
      subtractRects(zone, [
        { left: 0, top: 0, width: 40, height: 40 },
        { left: 50, top: 0, width: 50, height: 40 },
      ]),
    ).toEqual([{ left: 40, top: 0, width: 10, height: 40 }]);
  });

  it('ignores a hole that sits outside the zone', () => {
    expect(
      subtractRects(zone, [{ left: 200, top: 0, width: 10, height: 10 }]),
    ).toEqual([zone]);
  });

  it('clips a hole that extends past the zone', () => {
    expect(
      subtractRects(zone, [{ left: -10, top: 0, width: 30, height: 40 }]),
    ).toEqual([{ left: 20, top: 0, width: 80, height: 40 }]);
  });

  it('skips empty zones and empty holes', () => {
    expect(
      subtractRects({ left: 0, top: 0, width: 0, height: 40 }, [zone]),
    ).toEqual([]);
    expect(
      subtractRects(zone, [{ left: 0, top: 0, width: 0, height: 40 }]),
    ).toEqual([zone]);
  });
});

describe('roundDragRegionRect', () => {
  it('rounds each edge to the nearest CSS pixel', () => {
    expect(
      roundDragRegionRect({
        left: 10.4,
        top: 1.6,
        width: 20.5,
        height: 9.4,
      }),
    ).toEqual({ left: 10, top: 2, width: 21, height: 9 });
  });
});
