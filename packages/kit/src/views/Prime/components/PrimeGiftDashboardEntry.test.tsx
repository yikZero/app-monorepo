/** @jest-environment jsdom */

import type { ReactNode, Ref } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EPrimeGiftPages } from '@onekeyhq/shared/src/routes/prime';

import { PrimeGiftDashboardEntry } from './PrimeGiftDashboardEntry';

import type { IPrimeGiftClaimableDevice } from '../hooks/primeGiftClaimableDevices';

const mockPushModal = jest.fn();
const mockOfferClick = jest.fn();
let mockDevices: IPrimeGiftClaimableDevice[] | undefined = [];

jest.mock('../hooks/usePrimeGiftClaimableDevices', () => ({
  usePrimeGiftClaimableDevices: () => ({ devices: mockDevices }),
}));
jest.mock('../hooks/usePrimeGiftOfferImpression', () => ({
  usePrimeGiftOfferImpression: () => jest.fn(),
}));
jest.mock('../hooks/primeGiftDuration', () => ({
  getPrimeGiftDurationText: (value: { giftMonths?: number }) =>
    typeof value.giftMonths === 'number' && value.giftMonths > 0
      ? `${value.giftMonths} months`
      : '',
}));
jest.mock('@onekeyhq/kit/src/hooks/useAppNavigation', () => ({
  __esModule: true,
  default: () => ({ pushModal: mockPushModal }),
}));
jest.mock('@onekeyhq/shared/src/logger/logger', () => ({
  defaultLogger: {
    prime: {
      subscription: {
        primeGiftOfferClick: (...args: unknown[]) => {
          mockOfferClick(...args);
        },
      },
    },
  },
}));
jest.mock('@onekeyhq/components', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const Frame = React.forwardRef(function Frame(
    {
      children,
      onPress,
      testID,
    }: {
      children?: ReactNode;
      onPress?: () => void;
      testID?: string;
    },
    ref: Ref<HTMLElement>,
  ) {
    return React.createElement(
      onPress ? 'button' : 'div',
      {
        'data-testid': testID,
        onClick: onPress,
        ref,
        type: onPress ? 'button' : undefined,
      },
      children,
    );
  });
  return {
    Icon: () => null,
    Image: () => null,
    SizableText: ({ children }: { children?: ReactNode }) =>
      React.createElement('span', null, children),
    XStack: Frame,
    YStack: Frame,
  };
});

function device(
  serialNo: string,
  giftMonths: number,
): IPrimeGiftClaimableDevice {
  return {
    serialNo,
    createdAt: 1,
    device: { name: 'OneKey Pro 2' },
    wallet: { id: serialNo, name: serialNo },
    eligibility: {
      sno: serialNo,
      eligible: true,
      hasUnclaimedGift: true,
      giftDays: 180,
      giftMonths,
    },
  } as IPrimeGiftClaimableDevice;
}

function renderEntry() {
  return render(
    <IntlProvider locale="en" messages={{ prime_gift__title: 'Claim Prime' }}>
      <PrimeGiftDashboardEntry />
    </IntlProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = [];
});

it('renders nothing until a Pro 2 still has Prime to claim', () => {
  mockDevices = undefined;
  const hidden = renderEntry();
  expect(screen.queryByTestId('prime-gift-dashboard-entry')).toBeNull();
  hidden.unmount();

  mockDevices = [];
  renderEntry();
  expect(screen.queryByTestId('prime-gift-dashboard-entry')).toBeNull();
});

it('opens the intro and records the click for one or more devices', () => {
  mockDevices = [device('SN1', 6)];
  const view = renderEntry();
  expect(
    screen.getByText('Claim 6 months of Prime included with your Pro 2'),
  ).toBeTruthy();
  fireEvent.click(screen.getByTestId('prime-gift-dashboard-entry'));
  expect(mockOfferClick).toHaveBeenCalledWith({
    source: 'primeDashboard',
    deviceCount: 1,
  });
  expect(mockPushModal).toHaveBeenCalledWith(EModalRoutes.PrimeGiftModal, {
    screen: EPrimeGiftPages.PrimeGiftIntro,
  });

  mockDevices = [device('SN1', 6), device('SN2', 12)];
  view.rerender(
    <IntlProvider locale="en" messages={{ prime_gift__title: 'Claim Prime' }}>
      <PrimeGiftDashboardEntry />
    </IntlProvider>,
  );
  expect(screen.getByText('Claim Prime')).toBeTruthy();
  fireEvent.click(screen.getByTestId('prime-gift-dashboard-entry'));
  expect(mockOfferClick).toHaveBeenLastCalledWith({
    source: 'primeDashboard',
    deviceCount: 2,
  });
});
