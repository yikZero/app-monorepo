import { defaultLogger } from '../logger/logger';

import { getPrimePurchaseErrorAnalytics } from './primePurchaseErrorAnalytics';
import { getSanitizedErrorLogText } from './sensitiveErrorMessageUtils';

import type { IPrimePurchasesSdkCallParams } from '../logger/scopes/prime/scenes/subscription';

type IPrimeSdkCallContext = Pick<
  IPrimePurchasesSdkCallParams,
  'method' | 'sdk' | 'paywallSessionId' | 'purchaseFlowId'
> &
  Pick<IPrimePurchasesSdkCallParams, 'userMismatchRetried'>;

export async function runPrimePurchasesSdkCall<T>(
  context: IPrimeSdkCallContext,
  call: () => Promise<T> | T,
  getSuccessFields?: (
    result: T,
  ) => Pick<
    IPrimePurchasesSdkCallParams,
    | 'offeringId'
    | 'packageCount'
    | 'hasMonthly'
    | 'hasYearly'
    | 'hasFreeTrial'
    | 'priceCurrency'
    | 'trialEligibility'
    | 'userMismatchRetried'
  >,
  { reportSuccess = true }: { reportSuccess?: boolean } = {},
): Promise<T> {
  const startedAt = Date.now();
  let result: T;
  try {
    result = await call();
  } catch (error) {
    try {
      defaultLogger.prime.subscription.primePurchasesSdkCallLocal({
        ...context,
        errorMessage: getSanitizedErrorLogText(error),
      });
      defaultLogger.prime.subscription.primePurchasesSdkCall({
        ...context,
        ...getPrimePurchaseErrorAnalytics(error),
        status: 'failed',
        durationMs: Math.max(0, Date.now() - startedAt),
      });
    } catch {
      // Telemetry must not replace the original SDK error.
    }
    throw error;
  }
  if (!reportSuccess) {
    return result;
  }
  try {
    defaultLogger.prime.subscription.primePurchasesSdkCall({
      ...context,
      ...getSuccessFields?.(result),
      status: 'succeeded',
      durationMs: Math.max(0, Date.now() - startedAt),
    });
  } catch {
    // Telemetry must not turn a completed SDK operation into a failed purchase.
  }
  return result;
}
