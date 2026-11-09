/**
 * @jest-environment jsdom
 */

import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';

import {
  TOOLTIP_GROUP_OPEN_DELAY_MS,
  TOOLTIP_GROUP_SKIP_DELAY_MS,
  TooltipDelayGroup,
} from './tooltipDelayGroup';
import { useTooltipOpenState } from './useTooltipOpenState';

describe('TooltipDelayGroup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // Two tooltips rendered under the same group provider.
  function renderGroup() {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TooltipDelayGroup>{children}</TooltipDelayGroup>
    );
    const { result } = renderHook(
      () => [useTooltipOpenState({}), useTooltipOpenState({})] as const,
      { wrapper },
    );
    return {
      first: () => result.current[0],
      second: () => result.current[1],
    };
  }

  it('waits before opening the first tooltip of a cold group', () => {
    const { first } = renderGroup();
    act(() => first().handleOpenChange(true));
    expect(first().isOpen).toBe(false);

    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    expect(first().isOpen).toBe(true);
  });

  it('does not open when the pointer leaves before the delay ends', () => {
    const { first } = renderGroup();
    act(() => first().handleOpenChange(true));
    act(() => first().handleOpenChange(false));

    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    expect(first().isOpen).toBe(false);
  });

  it('opens the next tooltip immediately while the group is warm', () => {
    const { first, second } = renderGroup();
    act(() => first().handleOpenChange(true));
    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));

    act(() => first().handleOpenChange(false));
    act(() => second().handleOpenChange(true));
    expect(second().isOpen).toBe(true);
  });

  it('goes cold again after the skip window', () => {
    const { first, second } = renderGroup();
    act(() => first().handleOpenChange(true));
    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    act(() => first().handleOpenChange(false));

    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_SKIP_DELAY_MS));
    act(() => second().handleOpenChange(true));
    expect(second().isOpen).toBe(false);
  });

  it('a press cancels a pending open', () => {
    const { first } = renderGroup();
    act(() => first().handleOpenChange(true));
    act(() => first().handleTriggerPointerDown({ pointerType: 'mouse' }));

    act(() => jest.advanceTimersByTime(TOOLTIP_GROUP_OPEN_DELAY_MS));
    expect(first().isOpen).toBe(false);
  });

  it('tooltips outside a group still open immediately', () => {
    const { result } = renderHook(() => useTooltipOpenState({}));
    act(() => result.current.handleOpenChange(true));
    expect(result.current.isOpen).toBe(true);
  });
});
