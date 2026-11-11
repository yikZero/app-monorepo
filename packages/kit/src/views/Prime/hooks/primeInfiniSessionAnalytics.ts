import type {
  IPrimeEntryPoint,
  IPrimePurchaseAnalyticsContext,
} from '@onekeyhq/shared/types/prime/primeAnalytics';
import type {
  IPrimeInfiniPaymentFlowContext as IPrimeCryptoPaymentFlowContext,
  IPrimeInfiniPendingPaymentSession as IPrimePendingPaymentSession,
} from '@onekeyhq/shared/types/prime/primeTypes';

// cspell:ignore Infini

export function getPrimeCryptoSessionAnalyticsFields(
  context: (IPrimePurchaseAnalyticsContext & { flowId?: string }) | undefined,
): Pick<
  IPrimePendingPaymentSession,
  | 'flowId'
  | 'purchaseFlowId'
  | 'paywallSessionId'
  | 'entryPoint'
  | 'purchaseStartedAt'
> {
  const purchaseFlowId = context?.purchaseFlowId ?? context?.flowId;
  return {
    ...(context?.flowId ? { flowId: context.flowId } : {}),
    ...(purchaseFlowId ? { purchaseFlowId } : {}),
    ...(context?.paywallSessionId
      ? { paywallSessionId: context.paywallSessionId }
      : {}),
    ...(context?.entryPoint ? { entryPoint: context.entryPoint } : {}),
    ...(typeof context?.purchaseStartedAt === 'number'
      ? { purchaseStartedAt: context.purchaseStartedAt }
      : {}),
  };
}

export function getPrimeCryptoSessionFlowContext(
  session: Pick<
    IPrimePendingPaymentSession,
    | 'flowId'
    | 'purchaseFlowId'
    | 'paywallSessionId'
    | 'entryPoint'
    | 'purchaseStartedAt'
    | 'paymentCacheKey'
  >,
): IPrimeCryptoPaymentFlowContext {
  return {
    ...getPrimeCryptoSessionAnalyticsFields(session),
    flowId:
      session.flowId ??
      session.purchaseFlowId ??
      session.paymentCacheKey.bindingId,
  };
}

export function createPrimeCryptoPaymentFlowContext({
  context,
  flowId,
  fromEntryPoint,
  createFlowId,
}: {
  context?: IPrimePurchaseAnalyticsContext & { flowId?: string };
  flowId?: string;
  fromEntryPoint?: IPrimeEntryPoint;
  createFlowId: () => string;
}): IPrimeCryptoPaymentFlowContext {
  const existingFlowId = flowId ?? context?.flowId;
  const purchaseFlowId =
    context?.purchaseFlowId ?? existingFlowId ?? createFlowId();
  return {
    ...context,
    flowId: existingFlowId ?? purchaseFlowId,
    purchaseFlowId,
    entryPoint:
      context?.entryPoint ??
      fromEntryPoint ??
      (existingFlowId ? undefined : 'primePage'),
  };
}
