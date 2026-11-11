import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import type {
  IIdentityExitIntent,
  IIdentityExitReceipt,
} from '@onekeyhq/shared/types/prime/identityExitTypes';

export function reportIdentityExitReceiptTelemetry({
  intent,
  receipt,
}: {
  intent: IIdentityExitIntent;
  receipt: Extract<IIdentityExitReceipt, { status: 'completed' }>;
}) {
  if (!receipt.oneKeyIdLoggedOut) {
    defaultLogger.prime.subscription.onekeyIdStateTrace({
      reason: `identityExit:${intent.type}:${intent.scene}:completedWithoutOneKeyIdLogout`,
    });
    return;
  }
  defaultLogger.prime.subscription.onekeyIdLogout({
    reason: intent.scene === 'devSettings' ? 'debug' : 'userInitiated',
  });
}
