import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import type { IPrimeFetchPackagesFault } from '@onekeyhq/kit-bg/src/states/jotai/atoms/devSettings';

// Shapes follow the native PurchasesError (string `code`) so the simulated
// error goes through the same classification and analytics as a real one.
// Messages are marked as simulated; only code 23 keeps the RevenueCat wording
// because the China Storefront check matches it.
const SIMULATED_ERRORS: Record<
  Exclude<IPrimeFetchPackagesFault, 'off' | 'emptyOffering'>,
  { code: string; message: string; underlyingErrorMessage: string }
> = {
  '2': {
    code: '2',
    message: '[Simulated] store problem',
    underlyingErrorMessage: '',
  },
  '3': {
    code: '3',
    message: '[Simulated] purchase not allowed',
    underlyingErrorMessage: '',
  },
  '5': {
    code: '5',
    message: '[Simulated] product not available',
    underlyingErrorMessage: '',
  },
  '10': {
    code: '10',
    message: '[Simulated] network error',
    underlyingErrorMessage: '',
  },
  '23': {
    code: '23',
    message:
      '[Simulated] None of the products registered in the RevenueCat dashboard could be fetched',
    underlyingErrorMessage: '',
  },
  '33': {
    code: '33',
    message: '[Simulated] API endpoint blocked',
    underlyingErrorMessage: '',
  },
};

export type IPrimeSimulatedPackagesFault =
  | {
      type: 'error';
      error: (typeof SIMULATED_ERRORS)[keyof typeof SIMULATED_ERRORS];
    }
  | { type: 'emptyOffering' };

export async function getPrimeSimulatedPackagesFault(): Promise<
  IPrimeSimulatedPackagesFault | undefined
> {
  try {
    const devSettings =
      await backgroundApiProxy.serviceDevSetting.getDevSetting();
    const fault = devSettings?.enabled
      ? devSettings.settings?.primeFetchPackagesFault
      : undefined;
    if (!fault || fault === 'off') {
      return undefined;
    }
    if (fault === 'emptyOffering') {
      return { type: 'emptyOffering' };
    }
    return { type: 'error', error: { ...SIMULATED_ERRORS[fault] } };
  } catch {
    // Dev overrides must never block plan loading.
    return undefined;
  }
}
