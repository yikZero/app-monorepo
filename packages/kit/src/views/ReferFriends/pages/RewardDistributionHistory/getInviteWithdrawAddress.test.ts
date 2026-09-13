import type { IWithdrawAddress } from '@onekeyhq/shared/src/referralCode/type';

import { getInviteWithdrawAddress } from './getInviteWithdrawAddress';

function createWithdrawAddress(
  overrides: Partial<IWithdrawAddress>,
): IWithdrawAddress {
  return {
    _id: 'id',
    networkId: 'evm--1',
    userId: 'onekey-id',
    __v: 0,
    address: '0x1111111111111111111111111111111111111111',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('getInviteWithdrawAddress', () => {
  it('returns the OneKey ID first withdraw address', () => {
    const first = createWithdrawAddress({
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    const second = createWithdrawAddress({
      address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    expect(getInviteWithdrawAddress([first, second])).toBe(first);
  });

  it('returns undefined when the OneKey ID has no withdraw address', () => {
    expect(getInviteWithdrawAddress(undefined)).toBeUndefined();
    expect(getInviteWithdrawAddress([])).toBeUndefined();
  });
});
