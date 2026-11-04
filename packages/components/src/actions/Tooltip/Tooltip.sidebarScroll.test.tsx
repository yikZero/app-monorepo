/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
import type { ReactNode } from 'react';

import { Tooltip } from '.';

import { fireEvent, render, screen } from '@testing-library/react';

import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';

jest.mock('../../primitives', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Box = React.forwardRef<HTMLDivElement, { children?: ReactNode }>(
    function Box({ children }, ref) {
      return (
        <div ref={ref} data-testid="trigger">
          {children}
        </div>
      );
    },
  );
  return {
    Stack: Box,
    YStack: Box,
    XStack: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    SizableText: ({ children }: { children?: ReactNode }) => (
      <span>{children}</span>
    ),
  };
});

jest.mock('../Shortcut', () => ({ Shortcut: () => null }));
jest.mock('@floating-ui/dom', () => ({
  autoUpdate: jest.fn(() => jest.fn()),
  computePosition: jest.fn(async () => ({ x: 10, y: 20 })),
  flip: () => ({}),
  offset: () => ({}),
  shift: () => ({}),
  size: () => ({}),
}));
jest.mock('@onekeyfe/react-native-native-overlay', () => ({
  OVERLAY_LEVEL_ORDER: { modal: 0 },
  useNestedOverlayLevel: () => 'modal',
  OverlayView: ({
    visible,
    children,
  }: {
    visible: boolean;
    children?: ReactNode;
  }) => (visible ? <div>{children}</div> : null),
}));

const trigger = <button>Wallet</button>;
const sidebarContent = <Tooltip.Text>Wallet title</Tooltip.Text>;

function hoverTrigger() {
  const button = screen.getByRole('button', { name: 'Wallet' });
  const wrapper = button.parentElement;
  if (!wrapper) throw new OneKeyLocalError('Missing tooltip trigger wrapper');
  fireEvent(
    wrapper,
    Object.assign(new Event('pointerenter'), { pointerType: 'mouse' }),
  );
  return wrapper;
}

it('keeps a fixed sidebar hint open when an unrelated content pane scrolls', () => {
  render(
    <>
      <Tooltip renderTrigger={trigger} renderContent={sidebarContent} />
      <div data-testid="content-pane" />
    </>,
  );
  const wrapper = hoverTrigger();
  expect(screen.getByRole('tooltip').textContent).toBe('Wallet title');
  fireEvent.scroll(screen.getByTestId('content-pane'));
  expect(screen.getByRole('tooltip').textContent).toBe('Wallet title');
  fireEvent(
    wrapper,
    Object.assign(new Event('pointerleave'), { pointerType: 'mouse' }),
  );
  expect(screen.queryByRole('tooltip')).toBeNull();
});

it('preserves scroll dismissal for existing string-content tooltips', () => {
  render(
    <>
      <Tooltip renderTrigger={trigger} renderContent="Wallet title" />
      <div data-testid="content-pane" />
    </>,
  );
  hoverTrigger();
  expect(screen.getByRole('tooltip').textContent).toBe('Wallet title');
  fireEvent.scroll(screen.getByTestId('content-pane'));
  expect(screen.queryByRole('tooltip')).toBeNull();
});
