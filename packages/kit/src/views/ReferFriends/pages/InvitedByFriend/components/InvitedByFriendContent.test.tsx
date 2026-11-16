/** @jest-environment jsdom */
/* eslint-disable import/first */

import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

import type { IInvitePostConfig } from '@onekeyhq/shared/src/referralCode/type';

let mockPostConfigState: {
  postConfig: IInvitePostConfig | undefined;
  isSettled: boolean;
};

jest.mock('@onekeyhq/components', () => ({
  SizableText: ({ children }: { children?: ReactNode }) => (
    <span>{children}</span>
  ),
  Stack: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }: { id: string }) => <span>{id}</span>,
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }, values?: Record<string, string>) =>
      values?.amount ? `${id}:${values.amount}` : id,
  }),
}));

jest.mock('../../../hooks/useInvitePostConfig', () => ({
  useInvitePostConfig: () => mockPostConfigState,
}));

jest.mock('../../../components', () => ({
  ReferralBenefitsList: ({
    benefits,
    bottomNote,
  }: {
    benefits: { text: ReactNode }[];
    bottomNote?: ReactNode;
  }) => (
    <div>
      {benefits.map((benefit, index) => (
        <p key={index} data-testid="benefit">
          {benefit.text}
        </p>
      ))}
      {bottomNote ? <p data-testid="bottom-note">{bottomNote}</p> : null}
    </div>
  ),
}));

import { InvitedByFriendContent } from './InvitedByFriendContent';

function withDiscount(amount: number): IInvitePostConfig {
  return {
    inviteeDiscount: { amount, unit: '%' },
  } as unknown as IInvitePostConfig;
}

describe('InvitedByFriendContent', () => {
  it('shows the server rebate rate once the config settles', () => {
    mockPostConfigState = { postConfig: withDiscount(15), isSettled: true };
    render(<InvitedByFriendContent referralCode="ABCDEF" />);

    expect(screen.getByTestId('benefit').textContent).toContain('15%');
    expect(screen.getByTestId('bottom-note')).toBeTruthy();
  });

  it('promises no rebate when the server declines it', () => {
    mockPostConfigState = { postConfig: withDiscount(0), isSettled: true };
    render(<InvitedByFriendContent referralCode="ABCDEF" />);

    expect(screen.queryByTestId('benefit')).toBeNull();
    expect(screen.queryByTestId('bottom-note')).toBeNull();
  });

  it('holds the rebate line back until the config settles', () => {
    mockPostConfigState = { postConfig: undefined, isSettled: false };
    render(<InvitedByFriendContent referralCode="ABCDEF" />);

    expect(screen.queryByTestId('benefit')).toBeNull();
    expect(screen.queryByTestId('bottom-note')).toBeNull();
  });
});
