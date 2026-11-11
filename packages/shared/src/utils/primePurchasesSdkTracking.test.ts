import { defaultLogger } from '../logger/logger';

import { runPrimePurchasesSdkCall } from './primePurchasesSdkTracking';

describe('runPrimePurchasesSdkCall', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not emit repeated configure successes during entitlement polling', async () => {
    const loggerSpy = jest
      .spyOn(defaultLogger.prime.subscription, 'primePurchasesSdkCall')
      .mockImplementation(() => undefined as never);
    await expect(
      runPrimePurchasesSdkCall(
        { method: 'configure', sdk: 'web' },
        () => true,
        undefined,
        { reportSuccess: false },
      ),
    ).resolves.toBe(true);
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  it('preserves the successful SDK result and reports safe offering metadata', async () => {
    const loggerSpy = jest
      .spyOn(defaultLogger.prime.subscription, 'primePurchasesSdkCall')
      .mockImplementation(() => undefined as never);
    const result = { packages: ['monthly', 'annual'] };

    await expect(
      runPrimePurchasesSdkCall(
        {
          method: 'getOfferings',
          sdk: 'native',
          paywallSessionId: 'paywall-1',
        },
        () => result,
        (value) => ({ packageCount: value.packages.length }),
      ),
    ).resolves.toBe(result);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'getOfferings',
        sdk: 'native',
        paywallSessionId: 'paywall-1',
        packageCount: 2,
        status: 'succeeded',
        durationMs: expect.any(Number),
      }),
    );
  });

  it('rethrows the original SDK error without sending its message to server telemetry', async () => {
    const secret = 'user@example.com';
    const error = new Error(`store failed for ${secret}`);
    const localSpy = jest
      .spyOn(defaultLogger.prime.subscription, 'primePurchasesSdkCallLocal')
      .mockImplementation(() => undefined as never);
    const serverSpy = jest
      .spyOn(defaultLogger.prime.subscription, 'primePurchasesSdkCall')
      .mockImplementation(() => undefined as never);

    await expect(
      runPrimePurchasesSdkCall(
        { method: 'purchase', sdk: 'web', purchaseFlowId: 'flow-1' },
        () => {
          throw error;
        },
      ),
    ).rejects.toBe(error);

    expect(localSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'purchase',
        sdk: 'web',
        errorMessage: expect.stringContaining('store failed for [email]'),
      }),
    );
    expect(serverSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'purchase',
        sdk: 'web',
        purchaseFlowId: 'flow-1',
        status: 'failed',
        errorName: 'UNKNOWN_ERROR',
      }),
    );
    expect(JSON.stringify(serverSpy.mock.calls)).not.toContain(secret);
  });
});
