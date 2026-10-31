import { PRIME_WEB_CHECKOUT_PURCHASE_DATE_TOLERANCE_MS } from './primeWebCheckoutResult';
import { isExistingStoreSubscriptionPurchase } from './storeSubscriptionPurchase';

const startedAt = Date.UTC(2026, 9, 31, 12, 0, 0);
const olderThanAttempt =
  startedAt - PRIME_WEB_CHECKOUT_PURCHASE_DATE_TOLERANCE_MS - 1;
const atWindowBoundary =
  startedAt - PRIME_WEB_CHECKOUT_PURCHASE_DATE_TOLERANCE_MS;

describe('isExistingStoreSubscriptionPurchase', () => {
  it('treats a purchase older than this attempt as an existing subscription', () => {
    expect(
      isExistingStoreSubscriptionPurchase({
        latestPurchaseDateMillis: olderThanAttempt,
        startedAt,
      }),
    ).toBe(true);
    expect(
      isExistingStoreSubscriptionPurchase({
        transactionPurchaseDateMillis: olderThanAttempt,
        startedAt,
      }),
    ).toBe(true);
    expect(
      isExistingStoreSubscriptionPurchase({
        latestPurchaseDateMillis: olderThanAttempt,
        transactionPurchaseDateMillis: olderThanAttempt,
        startedAt,
      }),
    ).toBe(true);
  });

  it.each([
    ['the clock-skew boundary', atWindowBoundary],
    ['the start of this attempt', startedAt],
    ['a future purchase date', startedAt + 60_000],
  ])('keeps %s as a new payment', (_label, purchaseDate) => {
    expect(
      isExistingStoreSubscriptionPurchase({
        latestPurchaseDateMillis: purchaseDate,
        transactionPurchaseDateMillis: purchaseDate,
        startedAt,
      }),
    ).toBe(false);
  });

  it('keeps a new payment when any known date is recent', () => {
    expect(
      isExistingStoreSubscriptionPurchase({
        latestPurchaseDateMillis: olderThanAttempt,
        transactionPurchaseDateMillis: startedAt,
        startedAt,
      }),
    ).toBe(false);
    expect(
      isExistingStoreSubscriptionPurchase({
        latestPurchaseDateMillis: startedAt,
        transactionPurchaseDateMillis: olderThanAttempt,
        startedAt,
      }),
    ).toBe(false);
  });

  it.each([
    ['no purchase dates', {}],
    ['a null entitlement date', { latestPurchaseDateMillis: null }],
    ['a null transaction date', { transactionPurchaseDateMillis: null }],
    [
      'non-finite purchase dates',
      {
        latestPurchaseDateMillis: Number.NaN,
        transactionPurchaseDateMillis: Number.POSITIVE_INFINITY,
      },
    ],
  ])('keeps a new payment for %s', (_label, dates) => {
    expect(
      isExistingStoreSubscriptionPurchase({
        ...dates,
        startedAt,
      }),
    ).toBe(false);
  });

  it('keeps a new payment when the attempt time is not finite', () => {
    expect(
      isExistingStoreSubscriptionPurchase({
        latestPurchaseDateMillis: olderThanAttempt,
        startedAt: Number.NaN,
      }),
    ).toBe(false);
  });

  it('uses the shared RevenueCat clock-skew window by default', () => {
    expect(PRIME_WEB_CHECKOUT_PURCHASE_DATE_TOLERANCE_MS).toBe(5 * 60 * 1000);
    expect(
      isExistingStoreSubscriptionPurchase({
        latestPurchaseDateMillis: olderThanAttempt,
        startedAt,
      }),
    ).toBe(true);
  });
});
