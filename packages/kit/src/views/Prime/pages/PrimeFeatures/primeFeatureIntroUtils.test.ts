import { EPrimeFeatures } from '@onekeyhq/shared/src/routes/prime';

import {
  PRIME_FEATURE_INTROS,
  getPrimeFeatureIntroCtaKind,
  isPrimeFeatureIntroComingSoon,
} from './primeFeatureIntroUtils';

const EXTENSION_BROWSER_FEATURE_IDS = [
  EPrimeFeatures.TransactionSecurityCheck,
  EPrimeFeatures.BlockaidSiteScan,
  EPrimeFeatures.DAppTranslate,
];

describe('isPrimeFeatureIntroComingSoon', () => {
  it('returns false when the feature is missing', () => {
    expect(
      isPrimeFeatureIntroComingSoon({
        feature: undefined,
        isExtension: true,
      }),
    ).toBe(false);
  });

  it('returns true for a static coming-soon feature on every platform', () => {
    expect(
      isPrimeFeatureIntroComingSoon({
        feature: { isComingSoon: true, action: 'bulkSend' },
        isExtension: false,
      }),
    ).toBe(true);
  });

  it('marks browser-action features as coming soon only on extension', () => {
    const browserFeature = { action: 'browser' as const };

    expect(
      isPrimeFeatureIntroComingSoon({
        feature: browserFeature,
        isExtension: true,
      }),
    ).toBe(true);
    expect(
      isPrimeFeatureIntroComingSoon({
        feature: browserFeature,
        isExtension: false,
      }),
    ).toBe(false);
  });

  it('does not mark other feature actions as coming soon on extension', () => {
    expect(
      isPrimeFeatureIntroComingSoon({
        feature: { action: 'notifications' },
        isExtension: true,
      }),
    ).toBe(false);
  });
});

describe('getPrimeFeatureIntroCtaKind', () => {
  it('returns none for an unknown feature', () => {
    expect(
      getPrimeFeatureIntroCtaKind({
        featureId: undefined,
        isPrimeSubscriptionActive: true,
        isExtension: false,
      }),
    ).toBe('none');
  });

  it('returns subscribe when Prime is inactive, including extension browser features', () => {
    expect(
      getPrimeFeatureIntroCtaKind({
        featureId: EPrimeFeatures.DAppTranslate,
        isPrimeSubscriptionActive: false,
        isExtension: true,
      }),
    ).toBe('subscribe');
  });

  it('returns comingSoon for browser-action features on extension when Prime is active', () => {
    expect(
      getPrimeFeatureIntroCtaKind({
        featureId: EPrimeFeatures.DAppTranslate,
        isPrimeSubscriptionActive: true,
        isExtension: true,
      }),
    ).toBe('comingSoon');
    expect(
      getPrimeFeatureIntroCtaKind({
        featureId: EPrimeFeatures.BlockaidSiteScan,
        isPrimeSubscriptionActive: true,
        isExtension: true,
      }),
    ).toBe('comingSoon');
    expect(
      getPrimeFeatureIntroCtaKind({
        featureId: EPrimeFeatures.TransactionSecurityCheck,
        isPrimeSubscriptionActive: true,
        isExtension: true,
      }),
    ).toBe('comingSoon');
  });

  it('keeps the browser feature action on non-extension platforms', () => {
    expect(
      getPrimeFeatureIntroCtaKind({
        featureId: EPrimeFeatures.DAppTranslate,
        isPrimeSubscriptionActive: true,
        isExtension: false,
      }),
    ).toBe('featureAction');
  });

  it('keeps other Prime feature actions on extension', () => {
    expect(
      getPrimeFeatureIntroCtaKind({
        featureId: EPrimeFeatures.Notifications,
        isPrimeSubscriptionActive: true,
        isExtension: true,
      }),
    ).toBe('featureAction');
  });

  it('treats every catalog browser-action intro as coming soon on extension', () => {
    const browserFeatureIds = PRIME_FEATURE_INTROS.filter(
      (feature) => feature.action === 'browser',
    ).map((feature) => feature.id);

    expect(browserFeatureIds).toEqual(EXTENSION_BROWSER_FEATURE_IDS);
  });
});
