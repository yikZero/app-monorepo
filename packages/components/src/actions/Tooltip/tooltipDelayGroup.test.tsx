/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';

import {
  TOOLTIP_GROUP_OPEN_DELAY_MS,
  TOOLTIP_GROUP_SKIP_DELAY_MS,
  resetTooltipDelayGroupsForTest,
} from './tooltipDelayGroup';
import { useTooltipOpenState } from './useTooltipOpenState';

const GROUP = 'test-group';

function renderGroupTooltip() {
  return renderHook(() => useTooltipOpenState({ delayGroup: GROUP }));
}

describe('tooltip delay group', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetTooltipDelayGroupsForTest();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits before opening the first tooltip of a cold group', () => {
    const { result } = renderGroupTooltip();
    act(() => result.current.handleOpenChange(true));
    expect(result.current.isOpen).toBe(false);

    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    expect(result.current.isOpen).toBe(true);
  });

  it('does not open when the pointer leaves before the delay ends', () => {
    const { result } = renderGroupTooltip();
    act(() => result.current.handleOpenChange(true));
    act(() => result.current.handleOpenChange(false));

    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    expect(result.current.isOpen).toBe(false);
  });

  it('opens the next tooltip immediately while the group is warm', () => {
    const first = renderGroupTooltip();
    const second = renderGroupTooltip();
    act(() => first.result.current.handleOpenChange(true));
    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    expect(first.result.current.isOpen).toBe(true);

    act(() => first.result.current.handleOpenChange(false));
    act(() => second.result.current.handleOpenChange(true));
    expect(second.result.current.isOpen).toBe(true);
  });

  it('goes cold again after the skip window', () => {
    const first = renderGroupTooltip();
    const second = renderGroupTooltip();
    act(() => first.result.current.handleOpenChange(true));
    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    act(() => first.result.current.handleOpenChange(false));

    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_SKIP_DELAY_MS));
    act(() => second.result.current.handleOpenChange(true));
    expect(second.result.current.isOpen).toBe(false);
  });

  it('a press cancels a pending open', () => {
    const { result } = renderGroupTooltip();
    act(() => result.current.handleOpenChange(true));
    act(() =>
      result.current.handleTriggerPointerDown({ pointerType: 'mouse' }),
    );

    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    expect(result.current.isOpen).toBe(false);
  });

  it('tooltips without a group still open immediately', () => {
    const { result } = renderHook(() => useTooltipOpenState({}));
    act(() => result.current.handleOpenChange(true));
    expect(result.current.isOpen).toBe(true);
  });
});
