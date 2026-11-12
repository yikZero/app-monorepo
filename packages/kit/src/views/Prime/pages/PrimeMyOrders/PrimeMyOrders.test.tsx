/** @jest-environment jsdom */

import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IShopifyOrder } from '@onekeyhq/shared/types/prime/primeTypes';

import PrimeMyOrders from './PrimeMyOrders';

const mockOrder: IShopifyOrder = {
  orderNumber: '1001',
  status: 'fulfilled',
  itemCount: 1,
  createdAt: '2026-11-12T00:00:00.000Z',
  totalPrice: '10.00',
  currencyCode: 'USD',
  lineItems: [{ title: 'OneKey', quantity: 1, imageUrl: '' }],
};

let mockOrders: IShopifyOrder[] | undefined = [mockOrder];
let mockIsLoading = false;
let mockError: Error | undefined;

jest.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id,
  }),
}));

jest.mock('@react-navigation/core', () => ({
  useFocusEffect: () => undefined,
}));

jest.mock('@onekeyhq/components', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');

  const Container = ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children);

  return {
    Alert: Container,
    Badge: Container,
    Button: Container,
    Empty: ({
      button,
      description,
      title,
    }: {
      button?: ReactNode;
      description?: ReactNode;
      title?: ReactNode;
    }) => createElement('div', null, title, description, button),
    Icon: () => null,
    IconButton: () => null,
    Image: () => null,
    ListView: ({ ListFooterComponent }: { ListFooterComponent?: ReactNode }) =>
      createElement('div', null, ListFooterComponent),
    Page: Object.assign(Container, { Header: Container, Body: Container }),
    SizableText: Container,
    Spinner: () => null,
    Stack: Container,
    XStack: Container,
    YStack: Container,
    useClipboard: () => ({ copyText: jest.fn() }),
    useMedia: () => ({ gtMd: true }),
  };
});

jest.mock('@onekeyhq/kit/src/background/instance/backgroundApiProxy', () => ({
  __esModule: true,
  default: {
    servicePrime: {
      apiFetchShopifyOrders: async () => [],
      isLoggedIn: async () => true,
    },
  },
}));

jest.mock('@onekeyhq/kit/src/hooks/useAppNavigation', () => ({
  __esModule: true,
  default: () => ({ pop: jest.fn() }),
}));

jest.mock('@onekeyhq/shared/src/utils/openUrlUtils', () => ({
  __esModule: true,
  default: { openUrlExternal: jest.fn() },
}));

jest.mock('@onekeyhq/kit/src/hooks/usePromiseResult', () => ({
  usePromiseResult: () => ({
    error: mockError,
    isLoading: mockIsLoading,
    result: mockOrders,
  }),
}));

describe('PrimeMyOrders', () => {
  beforeEach(() => {
    mockOrders = [mockOrder];
    mockIsLoading = false;
    mockError = undefined;
  });

  it('shows the six-month note when orders are present', () => {
    render(<PrimeMyOrders />);

    expect(
      screen.getByText(ETranslations.prime_orders_last_6_months__desc),
    ).toBeTruthy();
  });

  it('keeps the empty state without the six-month note when there are no orders', () => {
    mockOrders = [];

    const { container } = render(<PrimeMyOrders />);

    expect(
      screen.queryByText(ETranslations.prime_orders_last_6_months__desc),
    ).toBeNull();
    expect(container.textContent).toContain(ETranslations.prime_no_order_yet);
  });

  it('does not show the six-month note when loading orders fails', () => {
    mockOrders = undefined;
    mockError = new Error('Order request failed');

    const { container } = render(<PrimeMyOrders />);

    expect(
      screen.queryByText(ETranslations.prime_orders_last_6_months__desc),
    ).toBeNull();
    expect(container.textContent).toContain(ETranslations.prime_no_order_yet);
  });

  it('does not show the six-month note while orders are loading', () => {
    mockOrders = undefined;
    mockIsLoading = true;

    render(<PrimeMyOrders />);

    expect(
      screen.queryByText(ETranslations.prime_orders_last_6_months__desc),
    ).toBeNull();
  });
});
