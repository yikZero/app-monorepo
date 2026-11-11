import {
  createPrimeCryptoPaymentFlowContext,
  getPrimeCryptoSessionAnalyticsFields,
  getPrimeCryptoSessionFlowContext,
} from './primeInfiniSessionAnalytics';

describe('Prime Infini session analytics context', () => {
  it('retains one context through invoice persistence, waiting, and restore', () => {
    const originalContext = {
      flowId: 'flow-1',
      purchaseFlowId: 'flow-1',
      paywallSessionId: 'paywall-1',
      entryPoint: 'settingsPrimeRow' as const,
      purchaseStartedAt: 1_700_000_000_000,
    };
    const persistedSession = {
      ...getPrimeCryptoSessionAnalyticsFields(originalContext),
      paymentCacheKey: { bindingId: 'binding-1' },
    };
    const restoredContext = getPrimeCryptoSessionFlowContext(
      persistedSession as Parameters<
        typeof getPrimeCryptoSessionFlowContext
      >[0],
    );
    const waitingSession =
      getPrimeCryptoSessionAnalyticsFields(restoredContext);
    const restoredSession = {
      ...waitingSession,
      paymentCacheKey: persistedSession.paymentCacheKey,
    };

    expect(restoredSession).toMatchObject(originalContext);
  });

  it('reuses a legacy flowId without inventing a source', () => {
    const flowContext = getPrimeCryptoSessionFlowContext({
      flowId: 'legacy-flow',
      paymentCacheKey: { bindingId: 'binding-1' },
    } as Parameters<typeof getPrimeCryptoSessionFlowContext>[0]);

    expect(flowContext).toEqual({
      flowId: 'legacy-flow',
      purchaseFlowId: 'legacy-flow',
    });
  });

  it('uses one generated id for direct-route flow and purchase correlation', () => {
    const createFlowId = jest.fn(() => 'generated-flow');

    expect(
      createPrimeCryptoPaymentFlowContext({
        createFlowId,
      }),
    ).toEqual({
      flowId: 'generated-flow',
      purchaseFlowId: 'generated-flow',
      entryPoint: 'primePage',
    });
    expect(createFlowId).toHaveBeenCalledTimes(1);
  });

  it('preserves legacy route attribution without inventing its entry point', () => {
    const createFlowId = jest.fn(() => 'unexpected-flow');

    expect(
      createPrimeCryptoPaymentFlowContext({
        context: { flowId: 'legacy-flow' },
        createFlowId,
      }),
    ).toEqual({
      flowId: 'legacy-flow',
      purchaseFlowId: 'legacy-flow',
      entryPoint: undefined,
    });
    expect(createFlowId).not.toHaveBeenCalled();
  });
});
