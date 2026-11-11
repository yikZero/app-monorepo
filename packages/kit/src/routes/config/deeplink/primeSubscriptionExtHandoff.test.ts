/** @jest-environment jsdom */

import {
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_CURRENCY_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_ENTRY_POINT_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_FALLBACK_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_FEATURE_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_PAYWALL_SESSION_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_PURCHASE_FLOW_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY,
  PRIME_CARD_CHECKOUT_EXT_HANDOFF_STARTED_AT_QUERY,
  PRIME_SUBSCRIPTION_EXT_HANDOFF_QUERY,
  PRIME_SUBSCRIPTION_EXT_HANDOFF_VALUE,
} from '@onekeyhq/shared/src/consts/deeplinkConsts';

import {
  consumePrimeCardCheckoutHandoffFromUrl,
  consumePrimeSubscriptionHandoffFromUrl,
} from './primeSubscriptionExtHandoff';

jest.mock('@onekeyhq/shared/src/platformEnv', () => ({
  __esModule: true,
  default: {
    isExtensionUiExpandTab: true,
  },
}));

describe('consumePrimeSubscriptionHandoffFromUrl', () => {
  beforeEach(() => {
    globalThis.history.replaceState(null, '', '#/');
  });

  it('consumes the expand-tab handoff and strips it from the hash', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_SUBSCRIPTION_EXT_HANDOFF_QUERY}=${PRIME_SUBSCRIPTION_EXT_HANDOFF_VALUE}&keep=true`,
    );

    expect(consumePrimeSubscriptionHandoffFromUrl()).toBe(true);
    expect(globalThis.location.hash).toBe('#/?keep=true');
  });

  it('ignores a hash without the handoff flag', () => {
    globalThis.history.replaceState(null, '', '#/?keep=true');

    expect(consumePrimeSubscriptionHandoffFromUrl()).toBe(false);
    expect(globalThis.location.hash).toBe('#/?keep=true');
  });

  it('ignores a handoff flag with the wrong value', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_SUBSCRIPTION_EXT_HANDOFF_QUERY}=0`,
    );

    expect(consumePrimeSubscriptionHandoffFromUrl()).toBe(false);
    expect(globalThis.location.hash).toBe(
      `#/?${PRIME_SUBSCRIPTION_EXT_HANDOFF_QUERY}=0`,
    );
  });
});

describe('consumePrimeCardCheckoutHandoffFromUrl', () => {
  beforeEach(() => {
    globalThis.history.replaceState(null, '', '#/');
  });

  it('consumes the plan and a known feature', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY}=P1M&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_FEATURE_QUERY}=BulkSend&keep=true`,
    );

    expect(consumePrimeCardCheckoutHandoffFromUrl()).toEqual({
      selectedSubscriptionPeriod: 'P1M',
      featureName: 'BulkSend',
    });
    expect(globalThis.location.hash).toBe('#/?keep=true');
  });

  it('drops an unknown feature', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY}=P1Y&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_FEATURE_QUERY}=Unknown`,
    );

    expect(consumePrimeCardCheckoutHandoffFromUrl()).toEqual({
      selectedSubscriptionPeriod: 'P1Y',
      featureName: undefined,
    });
  });

  it('consumes the fallback trigger and currency of a failed checkout', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY}=P1Y&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_FALLBACK_QUERY}=formNotLoaded&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_CURRENCY_QUERY}=EUR&keep=true`,
    );

    expect(consumePrimeCardCheckoutHandoffFromUrl()).toEqual({
      selectedSubscriptionPeriod: 'P1Y',
      featureName: undefined,
      currency: 'EUR',
      fallbackFrom: 'formNotLoaded',
    });
    expect(globalThis.location.hash).toBe('#/?keep=true');
  });

  it('drops an unknown fallback trigger and a malformed currency', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY}=P1M&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_FALLBACK_QUERY}=autoPay&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_CURRENCY_QUERY}=US%2FD`,
    );

    const handoff = consumePrimeCardCheckoutHandoffFromUrl();
    expect(handoff?.selectedSubscriptionPeriod).toBe('P1M');
    expect(handoff?.fallbackFrom).toBeUndefined();
    expect(handoff?.currency).toBeUndefined();
    expect(globalThis.location.hash).toBe('#/');
  });

  it('preserves an explicit switch from embedded to hosted checkout', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY}=P1M&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_FALLBACK_QUERY}=userRequestedHostedCheckout`,
    );
    expect(consumePrimeCardCheckoutHandoffFromUrl()).toMatchObject({
      selectedSubscriptionPeriod: 'P1M',
      fallbackFrom: 'userRequestedHostedCheckout',
    });
    expect(globalThis.location.hash).toBe('#/');
  });

  it('preserves only validated purchase analytics context', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY}=P1Y&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_PAYWALL_SESSION_QUERY}=123e4567-e89b-12d3-a456-426614174000&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_PURCHASE_FLOW_QUERY}=123e4567-e89b-12d3-a456-426614174001&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_ENTRY_POINT_QUERY}=settingsPrimeRow&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_STARTED_AT_QUERY}=1700000000000`,
    );

    expect(consumePrimeCardCheckoutHandoffFromUrl()).toMatchObject({
      selectedSubscriptionPeriod: 'P1Y',
      analyticsContext: {
        paywallSessionId: '123e4567-e89b-12d3-a456-426614174000',
        purchaseFlowId: '123e4567-e89b-12d3-a456-426614174001',
        entryPoint: 'settingsPrimeRow',
        purchaseStartedAt: 1_700_000_000_000,
      },
    });
    expect(globalThis.location.hash).toBe('#/');
  });

  it('drops malformed analytics context from the extension handoff', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY}=P1M&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_PAYWALL_SESSION_QUERY}=not-a-uuid&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_PURCHASE_FLOW_QUERY}=also-invalid&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_ENTRY_POINT_QUERY}=freeform&${PRIME_CARD_CHECKOUT_EXT_HANDOFF_STARTED_AT_QUERY}=invalid`,
    );

    const handoff = consumePrimeCardCheckoutHandoffFromUrl();
    expect(handoff).toMatchObject({ selectedSubscriptionPeriod: 'P1M' });
    expect(handoff).not.toHaveProperty('analyticsContext');
  });

  it('strips but ignores an invalid plan', () => {
    globalThis.history.replaceState(
      null,
      '',
      `#/?${PRIME_CARD_CHECKOUT_EXT_HANDOFF_QUERY}=P3M`,
    );

    expect(consumePrimeCardCheckoutHandoffFromUrl()).toBeUndefined();
    expect(globalThis.location.hash).toBe('#/');
  });

  it('ignores a hash without the handoff', () => {
    globalThis.history.replaceState(null, '', '#/?keep=true');

    expect(consumePrimeCardCheckoutHandoffFromUrl()).toBeUndefined();
    expect(globalThis.location.hash).toBe('#/?keep=true');
  });
});
