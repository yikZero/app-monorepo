import { PRIME_WEB_CHECKOUT_PURCHASE_DATE_TOLERANCE_MS } from './primeWebCheckoutResult';

function readPurchaseDateMillis(
  value: number | null | undefined,
): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

// A store resubscribe can reattach an older subscription to the current
// OneKey ID without charging. Treat that as a restore only when every known
// purchase date is older than this attempt. A missing or recent date stays a
// new payment so a real charge is not relabeled.
export function isExistingStoreSubscriptionPurchase({
  latestPurchaseDateMillis,
  transactionPurchaseDateMillis,
  startedAt,
  toleranceMs = PRIME_WEB_CHECKOUT_PURCHASE_DATE_TOLERANCE_MS,
}: {
  latestPurchaseDateMillis?: number | null;
  transactionPurchaseDateMillis?: number | null;
  startedAt: number;
  toleranceMs?: number;
}): boolean {
  const purchaseDates = [
    readPurchaseDateMillis(latestPurchaseDateMillis),
    readPurchaseDateMillis(transactionPurchaseDateMillis),
  ].filter((value): value is number => value !== undefined);
  if (purchaseDates.length === 0 || !Number.isFinite(startedAt)) {
    return false;
  }
  const earliestNewPurchaseAt = startedAt - toleranceMs;
  return purchaseDates.every(
    (purchaseDate) => purchaseDate < earliestNewPurchaseAt,
  );
}
