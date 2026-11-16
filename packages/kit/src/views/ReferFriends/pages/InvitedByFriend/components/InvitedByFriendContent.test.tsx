/** @jest-environment jsdom */
/* eslint-disable import/first */

import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

import type { IInvitePostConfig } from '@onekeyhq/shared/src/referralCode/type';

let mockPostConfigState: {
  postConfig: IInvitePostConfig | undefined;
  isSettled: boolean;
};

jest.mock('@onekeyhq/components', () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Icon: () => <i />,
    SizableText: ({ children }: { children?: ReactNode }) => (
      <span>{children}</span>
    ),
    XStack: Box,
    YStack: Box,
  };
});

jest.mock('../../../hooks/useInvitePostConfig', () => ({
  useInvitePostConfig: () => mockPostConfigState,
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

    expect(screen.getByText(/15%/)).toBeTruthy();
    expect(screen.getByText(/ABCDEF/)).toBeTruthy();
  });

  it('promises no rebate when the server declines it', () => {
    mockPostConfigState = { postConfig: withDiscount(0), isSettled: true };
    render(<InvitedByFriendContent referralCode="ABCDEF" />);

    expect(screen.queryByText(/0%/)).toBeNull();
    expect(screen.queryByText(/varies/i)).toBeNull();
  });

  it('holds the rebate line back until the config settles', () => {
    mockPostConfigState = { postConfig: undefined, isSettled: false };
    render(<InvitedByFriendContent referralCode="ABCDEF" />);

    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('omits the code pill when the link carried no code', () => {
    mockPostConfigState = { postConfig: undefined, isSettled: false };
    const { container } = render(<InvitedByFriendContent referralCode="" />);

    expect(container.textContent).not.toMatch(/referral code/i);
  });
});
