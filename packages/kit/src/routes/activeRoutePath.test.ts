import { getActiveRoutePath } from './activeRoutePath';

import type { NavigationState } from '@react-navigation/routers';

describe('getActiveRoutePath', () => {
  it('follows the active route at every level', () => {
    const state = {
      index: 1,
      routes: [
        { key: 'main', name: 'main' },
        {
          key: 'modal',
          name: 'modal',
          state: {
            routes: [
              { key: 'a', name: 'SettingModal' },
              {
                key: 'b',
                name: 'AddressRiskCheckModal',
                params: { networkId: 'evm--1' },
              },
            ],
          },
        },
      ],
    } as unknown as NavigationState;

    expect(getActiveRoutePath(state)).toEqual([
      { name: 'modal', params: undefined },
      { name: 'AddressRiskCheckModal', params: { networkId: 'evm--1' } },
    ]);
  });

  it('returns an empty path for an undefined or empty state', () => {
    expect(getActiveRoutePath(undefined)).toEqual([]);
    expect(
      getActiveRoutePath({ routes: [] } as unknown as NavigationState),
    ).toEqual([]);
  });
});
