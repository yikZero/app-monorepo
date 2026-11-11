import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';
import { EOneKeyErrorClassNames } from '@onekeyhq/shared/src/errors/types/errorTypes';

import primePaymentUtils from './primePaymentUtils';

jest.mock('@onekeyhq/kit/src/background/instance/backgroundApiProxy', () => ({
  __esModule: true,
  default: {
    simpleDb: {
      prime: {
        claimPrimePurchaseAnalyticsEvent: jest.fn(async () => true),
      },
    },
  },
}));

/*
yarn test packages/kit/src/views/Prime/hooks/primePaymentUtils.test.ts
*/

describe('primePaymentUtils', () => {
  describe('normalizeNativePrice', () => {
    it('keeps current RevenueCat prices in major currency units', () => {
      expect(primePaymentUtils.normalizeNativePrice(29.99, 'major')).toBe(
        29.99,
      );
    });

    it('converts legacy Android RevenueCat prices from micros', () => {
      expect(primePaymentUtils.normalizeNativePrice(29_990_000, 'micros')).toBe(
        29.99,
      );
    });
  });

  describe('normalizePrimePeriodType', () => {
    it.each([
      ['TRIAL', 'trial'],
      ['INTRO', 'intro'],
      ['NORMAL', 'normal'],
    ])('normalizes %s', (input, expected) => {
      expect(primePaymentUtils.normalizePrimePeriodType(input)).toBe(expected);
    });

    it('omits unknown period types', () => {
      expect(primePaymentUtils.normalizePrimePeriodType('unknown')).toBe(
        undefined,
      );
    });
  });

  describe('extractCurrencySymbol', () => {
    it('should extract $ from $183.77', () => {
      expect(primePaymentUtils.extractCurrencySymbol('$183.77')).toBe('$');
    });

    it('should extract US$ from US$328.44', () => {
      expect(primePaymentUtils.extractCurrencySymbol('US$328.44')).toBe('US$');
    });

    it('should extract € from €99.99', () => {
      expect(primePaymentUtils.extractCurrencySymbol('€99.99')).toBe('€');
    });

    it('should extract ¥ from ¥100', () => {
      expect(primePaymentUtils.extractCurrencySymbol('¥100')).toBe('¥');
    });

    it('should extract £ from £50', () => {
      expect(primePaymentUtils.extractCurrencySymbol('£50')).toBe('£');
    });

    it('should extract CA$ from CA$75.50', () => {
      expect(primePaymentUtils.extractCurrencySymbol('CA$75.50')).toBe('CA$');
    });

    it('should extract RMB¥ from RMB¥100', () => {
      expect(primePaymentUtils.extractCurrencySymbol('RMB¥100')).toBe('RMB¥');
    });

    it('should extract $ from -$50', () => {
      expect(primePaymentUtils.extractCurrencySymbol('-$50')).toBe('$');
    });

    it('should extract US$ from US$-100', () => {
      expect(primePaymentUtils.extractCurrencySymbol('US$-100')).toBe('US$');
    });

    it('should extract $ from -$50.99', () => {
      expect(primePaymentUtils.extractCurrencySymbol('-$50.99')).toBe('$');
    });

    it('should extract US$ from US$-100.50', () => {
      expect(primePaymentUtils.extractCurrencySymbol('US$-100.50')).toBe('US$');
    });

    it('should extract € from -€75.25', () => {
      expect(primePaymentUtils.extractCurrencySymbol('-€75.25')).toBe('€');
    });

    it('should extract ¥ from CNY¥-88.88', () => {
      expect(primePaymentUtils.extractCurrencySymbol('-¥88.88')).toBe('¥');
    });
  });

  describe('classifyPurchaseError', () => {
    it('classifies react-native-purchases cancellation via userCancelled flag', () => {
      expect(
        primePaymentUtils.classifyPurchaseError({
          userCancelled: true,
          code: 1,
          message: 'Purchase was cancelled.',
        }),
      ).toMatchObject({
        reason: 'userCancelled',
        errorCode: '1',
        errorMessage: 'Purchase was cancelled.',
        errorName: 'PURCHASE_CANCELLED_ERROR',
        underlyingErrorCategory: 'unknown',
      });
    });

    it('classifies native cancellation via readable message when the flag is missing', () => {
      expect(
        primePaymentUtils.classifyPurchaseError(
          new Error('Purchase was cancelled.'),
        ),
      ).toMatchObject({
        reason: 'userCancelled',
        errorCode: undefined,
        errorMessage: 'Purchase was cancelled.',
        errorName: 'UNKNOWN_ERROR',
        underlyingErrorCategory: 'unknown',
      });
    });

    it('classifies purchases-js cancellation via errorCode', () => {
      expect(
        primePaymentUtils.classifyPurchaseError({
          errorCode: 1,
          message: 'User cancelled',
        }),
      ).toMatchObject({
        reason: 'userCancelled',
        errorCode: '1',
        errorMessage: 'User cancelled',
        errorName: 'PURCHASE_CANCELLED_ERROR',
        underlyingErrorCategory: 'unknown',
      });
    });

    it('classifies other errors as paymentFailed with a stringified code', () => {
      expect(
        primePaymentUtils.classifyPurchaseError({
          code: 2,
          userCancelled: false,
          message: 'Store connection failed',
        }),
      ).toMatchObject({
        reason: 'paymentFailed',
        errorCode: '2',
        errorMessage: 'Store connection failed',
        errorName: 'STORE_PROBLEM_ERROR',
        underlyingErrorCategory: 'unknown',
      });
    });

    it('handles non-object errors safely', () => {
      expect(primePaymentUtils.classifyPurchaseError(undefined)).toMatchObject({
        reason: 'paymentFailed',
        errorCode: undefined,
        errorMessage: undefined,
        errorName: 'UNKNOWN_ERROR',
        underlyingErrorCategory: 'unknown',
      });
    });

    it('classifies OneKeyLocalError as clientError', () => {
      expect(
        primePaymentUtils.classifyPurchaseError(
          new OneKeyLocalError('Offering not found'),
        ),
      ).toMatchObject({
        reason: 'clientError',
        errorCode: '-99999',
        errorMessage: 'Offering not found',
        clientErrorKey: 'offeringNotFound',
        errorName: 'UNKNOWN_ERROR',
        underlyingErrorCategory: 'unknown',
      });
    });

    it('classifies a deserialized OneKeyLocalError via className', () => {
      expect(
        primePaymentUtils.classifyPurchaseError({
          className: EOneKeyErrorClassNames.OneKeyLocalError,
          message: 'PrimeAuth native not ready!',
        }),
      ).toMatchObject({
        reason: 'clientError',
        errorCode: undefined,
        errorMessage: 'PrimeAuth native not ready!',
        clientErrorKey: 'sdkNotReady',
        errorName: 'UNKNOWN_ERROR',
        underlyingErrorCategory: 'unknown',
      });
    });

    it('classifies RevenueCat payment-pending code 20 separately from payment failure', () => {
      expect(
        primePaymentUtils.classifyPurchaseError({
          code: 20,
          message: 'Payment pending',
        }),
      ).toMatchObject({
        reason: 'paymentPending',
        errorCode: '20',
      });
      expect(
        primePaymentUtils.classifyPurchaseError({
          code: 2,
          userCancelled: false,
          message: 'Store problem',
        }).reason,
      ).toBe('paymentFailed');
    });
  });

  describe('extractWebPaywallPrice', () => {
    it('preserves non-USD currency and leaves missing currency unset', () => {
      expect(
        primePaymentUtils.extractWebPaywallPrice({
          rcBillingProduct: {
            currentPrice: { amountMicros: 19_990_000, currency: 'EUR' },
          },
        }),
      ).toEqual({ amount: 19.99, currency: 'EUR' });
      expect(
        primePaymentUtils.extractWebPaywallPrice({
          rcBillingProduct: {
            currentPrice: { amountMicros: 19_990_000 },
          },
        }),
      ).toEqual({ amount: 19.99, currency: undefined });
    });
  });
});
