import type { IRevenueCatPurchaseResult } from '@onekeyhq/shared/types/prime/revenueCat';

import { isAppleExistingSubscriptionPurchaseResult } from './primeStoreExistingSubscription';

const startedAtMs = Date.parse('2026-10-10T12:00:00.000Z');
const minute = 60 * 1000;

function buildResult({
  purchaseDate,
  requestDate,
}: {
  purchaseDate?: string;
  requestDate?: string;
}): IRevenueCatPurchaseResult {
  return {
    customerInfo: {
      managementURL: null,
      requestDate,
      entitlements: {
        active: {
          Prime: {
            isActive: true,
            willRenew: true,
            isSandbox: false,
            expirationDateMillis: null,
          },
        },
      },
    },
    transaction:
      purchaseDate === undefined
        ? undefined
        : {
            transactionIdentifier: 'tx',
            productIdentifier: 'prime.yearly',
            purchaseDate,
          },
  };
}

const iso = (ms: number) => new Date(ms).toISOString();

describe('isAppleExistingSubscriptionPurchaseResult', () => {
  it('detects an existing subscription returned by StoreKit', () => {
    expect(
      isAppleExistingSubscriptionPurchaseResult({
        purchaseResult: buildResult({
          purchaseDate: iso(startedAtMs - 20 * 24 * 60 * minute),
          requestDate: iso(startedAtMs + 30 * 1000),
        }),
        purchaseStartedAtMs: startedAtMs,
      }),
    ).toBe(true);
  });

  it('treats a transaction charged during the attempt as a new purchase', () => {
    expect(
      isAppleExistingSubscriptionPurchaseResult({
        purchaseResult: buildResult({
          purchaseDate: iso(startedAtMs + 40 * 1000),
          requestDate: iso(startedAtMs + 45 * 1000),
        }),
        purchaseStartedAtMs: startedAtMs,
      }),
    ).toBe(false);
  });

  it('does not misreport a new purchase when only the device clock is ahead', () => {
    // Device clock runs 1h ahead; Apple and RevenueCat agree the charge is new.
    const deviceSkewMs = 60 * minute;
    expect(
      isAppleExistingSubscriptionPurchaseResult({
        purchaseResult: buildResult({
          purchaseDate: iso(startedAtMs - deviceSkewMs + 40 * 1000),
          requestDate: iso(startedAtMs - deviceSkewMs + 45 * 1000),
        }),
        purchaseStartedAtMs: startedAtMs,
      }),
    ).toBe(false);
  });

  it('does not misreport a new purchase when only the receipt post is slow', () => {
    expect(
      isAppleExistingSubscriptionPurchaseResult({
        purchaseResult: buildResult({
          purchaseDate: iso(startedAtMs + 40 * 1000),
          requestDate: iso(startedAtMs + 10 * minute),
        }),
        purchaseStartedAtMs: startedAtMs,
      }),
    ).toBe(false);
  });

  it('falls back to the purchase path without transaction or request dates', () => {
    const oldDate = iso(startedAtMs - 20 * 24 * 60 * minute);
    expect(
      isAppleExistingSubscriptionPurchaseResult({
        purchaseResult: buildResult({ requestDate: iso(startedAtMs) }),
        purchaseStartedAtMs: startedAtMs,
      }),
    ).toBe(false);
    expect(
      isAppleExistingSubscriptionPurchaseResult({
        purchaseResult: buildResult({ purchaseDate: oldDate }),
        purchaseStartedAtMs: startedAtMs,
      }),
    ).toBe(false);
    expect(
      isAppleExistingSubscriptionPurchaseResult({
        purchaseResult: buildResult({
          purchaseDate: 'not-a-date',
          requestDate: iso(startedAtMs),
        }),
        purchaseStartedAtMs: startedAtMs,
      }),
    ).toBe(false);
    expect(
      isAppleExistingSubscriptionPurchaseResult({
        purchaseResult: undefined,
        purchaseStartedAtMs: startedAtMs,
      }),
    ).toBe(false);
  });
});
