import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';

import {
  getPrimePackagesFailureKind,
  getPrimeStorefrontCountryCode,
} from './primePackagesFetchFailure';

describe('Prime packages fail state classification', () => {
  it.each([
    ['10', 'network'],
    ['32', 'network'],
    ['33', 'network'],
    ['35', 'network'],
    ['2', 'storeUnavailable'],
    ['3', 'purchaseNotAllowed'],
    ['5', 'productUnavailable'],
    ['23', 'productUnavailable'],
    ['16', 'unknown'],
    [undefined, 'unknown'],
  ] as const)('maps RevenueCat code %s to %s', (errorCode, kind) => {
    expect(
      getPrimePackagesFailureKind({
        errorCode,
        underlyingErrorCategory: 'unknown',
      }),
    ).toBe(kind);
  });

  it('prefers a network cause kept under a configuration error', () => {
    expect(
      getPrimePackagesFailureKind({
        errorCode: '23',
        underlyingErrorCategory: 'network',
      }),
    ).toBe('network');
  });

  it('treats an empty offering as product unavailable', () => {
    expect(
      getPrimePackagesFailureKind({
        underlyingErrorCategory: 'unknown',
        isEmptyOffering: true,
      }),
    ).toBe('productUnavailable');
  });
});

describe('Prime Storefront country for analytics', () => {
  it.each(['CHN', 'USA', 'US'])('keeps %s', async (countryCode) => {
    await expect(
      getPrimeStorefrontCountryCode(async () => ({ countryCode })),
    ).resolves.toBe(countryCode);
  });

  it.each(['', 'cn', 'CN-1'])('drops %j', async (countryCode) => {
    await expect(
      getPrimeStorefrontCountryCode(async () => ({ countryCode })),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when Storefront is missing or fails', async () => {
    await expect(getPrimeStorefrontCountryCode()).resolves.toBeUndefined();
    await expect(
      getPrimeStorefrontCountryCode(async () => null),
    ).resolves.toBeUndefined();
    await expect(
      getPrimeStorefrontCountryCode(async () => {
        throw new OneKeyLocalError('unavailable');
      }),
    ).resolves.toBeUndefined();
  });
});
