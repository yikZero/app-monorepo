import { getPrimePurchaseErrorAnalytics } from './primePurchaseErrorAnalytics';

describe('getPrimePurchaseErrorAnalytics', () => {
  it('maps known RevenueCat codes and never returns raw error details', () => {
    const secret = 'user@example.com';
    const result = getPrimePurchaseErrorAnalytics({
      code: 20,
      message: `payment pending for ${secret}`,
      underlyingErrorMessage: `request failed for ${secret}`,
    });

    expect(result).toEqual({
      errorCode: '20',
      errorName: 'PAYMENT_PENDING_ERROR',
      underlyingErrorCategory: 'unknown',
    });
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result).not.toHaveProperty('message');
    expect(result).not.toHaveProperty('underlyingErrorMessage');
  });
});
