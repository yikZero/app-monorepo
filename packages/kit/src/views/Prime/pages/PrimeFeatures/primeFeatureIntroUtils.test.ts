import { shouldExplainPrimeBrowserActionOnExtension } from './primeFeatureIntroUtils';

describe('shouldExplainPrimeBrowserActionOnExtension', () => {
  it('explains a subscribed browser action on the extension', () => {
    expect(
      shouldExplainPrimeBrowserActionOnExtension({
        isExtension: true,
        action: 'browser',
        ctaKind: 'featureAction',
      }),
    ).toBe(true);
  });

  it('keeps the subscribe and coming-soon actions', () => {
    expect(
      shouldExplainPrimeBrowserActionOnExtension({
        isExtension: true,
        action: 'browser',
        ctaKind: 'subscribe',
      }),
    ).toBe(false);
    expect(
      shouldExplainPrimeBrowserActionOnExtension({
        isExtension: true,
        action: 'browser',
        ctaKind: 'comingSoon',
      }),
    ).toBe(false);
  });

  it('keeps other subscribed actions on the extension', () => {
    expect(
      shouldExplainPrimeBrowserActionOnExtension({
        isExtension: true,
        action: 'bulkSend',
        ctaKind: 'featureAction',
      }),
    ).toBe(false);
  });

  it('keeps the browser action outside the extension', () => {
    expect(
      shouldExplainPrimeBrowserActionOnExtension({
        isExtension: false,
        action: 'browser',
        ctaKind: 'featureAction',
      }),
    ).toBe(false);
  });
});
