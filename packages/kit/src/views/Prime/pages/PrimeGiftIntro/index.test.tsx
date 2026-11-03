/** @jest-environment jsdom */

import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import PrimeGiftIntroPage from '@onekeyhq/kit/src/views/Prime/pages/PrimeGiftIntro';
import type { IDBDevice } from '@onekeyhq/kit-bg/src/dbs/local/types';
import { EPrimeGiftPages } from '@onekeyhq/shared/src/routes/prime';

import type { IPrimeGiftClaimableDevice } from '../../hooks/primeGiftClaimableDevices';

const mockPush = jest.fn();
const mockPopStack = jest.fn();
let mockDevices: IPrimeGiftClaimableDevice[] | undefined;

jest.mock('../../hooks/usePrimeGiftClaimableDevices', () => ({
  usePrimeGiftClaimableDevices: () => ({ devices: mockDevices }),
}));
jest.mock('../../components/PrimeGiftViews', () => ({
  openBenefits: jest.fn(),
}));
jest.mock('@onekeyhq/kit/src/hooks/useAppNavigation', () => ({
  __esModule: true,
  default: () => ({
    push: mockPush,
    popStack: mockPopStack,
  }),
}));
jest.mock('@onekeyhq/components', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const Frame = ({
    children,
    testID,
  }: {
    children?: ReactNode;
    testID?: string;
  }) => React.createElement('div', { 'data-testid': testID }, children);
  return {
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children?: ReactNode;
      onPress?: () => void;
      testID?: string;
    }) =>
      React.createElement(
        'button',
        { 'data-testid': testID, onClick: onPress, type: 'button' },
        children,
      ),
    Icon: () => null,
    NavCloseButton: () => null,
    Page: Object.assign(Frame, {
      Header: () => null,
      Body: Frame,
      Footer: Frame,
      FooterActions: ({
        onConfirm,
        onConfirmText,
        confirmButtonProps,
      }: {
        onConfirm?: () => void;
        onConfirmText?: string;
        confirmButtonProps?: { testID?: string };
      }) =>
        React.createElement(
          'button',
          {
            'data-testid': confirmButtonProps?.testID,
            onClick: onConfirm,
            type: 'button',
          },
          onConfirmText,
        ),
    }),
    SizableText: ({ children }: { children?: ReactNode }) =>
      React.createElement('span', null, children),
    Spinner: ({ testID }: { testID?: string }) =>
      React.createElement('div', { 'data-testid': testID }),
    YStack: Frame,
    useThemeName: () => 'dark',
  };
});

function device(serialNo: string): IPrimeGiftClaimableDevice {
  return {
    serialNo,
    createdAt: 1,
    wallet: { id: serialNo, name: serialNo },
    device: {
      connectId: `connect-${serialNo}`,
      uuid: serialNo,
      deviceId: `device-${serialNo}`,
      deviceType: 'pro2',
      name: 'OneKey Pro 2',
    } as IDBDevice,
    eligibility: {
      sno: serialNo,
      eligible: true,
      hasUnclaimedGift: true,
      giftDays: 180,
      giftMonths: 6,
    },
  } as IPrimeGiftClaimableDevice;
}

function renderIntro() {
  return render(
    <IntlProvider
      locale="en"
      messages={{ prime_gift_benefits__action: 'See Prime benefits' }}
    >
      <PrimeGiftIntroPage />
    </IntlProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = undefined;
});

it('claims the only Pro 2 directly and asks for a choice when there are several', () => {
  mockDevices = [device('SN1234')];
  const view = renderIntro();
  fireEvent.click(screen.getByTestId('prime-gift-intro-claim'));
  expect(mockPush).toHaveBeenCalledWith(EPrimeGiftPages.PrimeGift, {
    device: expect.objectContaining({
      connectId: 'connect-SN1234',
      deviceType: 'pro2',
      serialNo: 'SN1234',
    }),
    serialNo: 'SN1234',
    source: 'primeDashboard',
  });

  mockDevices = [device('SN1234'), device('SN5678')];
  view.rerender(
    <IntlProvider
      locale="en"
      messages={{ prime_gift_benefits__action: 'See Prime benefits' }}
    >
      <PrimeGiftIntroPage />
    </IntlProvider>,
  );
  fireEvent.click(screen.getByTestId('prime-gift-intro-claim'));
  expect(mockPush).toHaveBeenLastCalledWith(
    EPrimeGiftPages.PrimeGiftSelectDevice,
  );
});

it('lets the user leave once every Pro 2 has been claimed', () => {
  mockDevices = [];
  renderIntro();
  expect(screen.queryByTestId('prime-gift-intro-claim')).toBeNull();
  fireEvent.click(screen.getByText('Close'));
  expect(mockPopStack).toHaveBeenCalledTimes(1);
});
