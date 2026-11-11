import { reportIdentityExitReceiptTelemetry } from './identityExitTelemetry';

const mockOnekeyIdLogout = jest.fn();
const mockOnekeyIdStateTrace = jest.fn();

jest.mock('@onekeyhq/shared/src/logger/logger', () => ({
  defaultLogger: {
    prime: {
      subscription: {
        onekeyIdLogout: (...args: unknown[]) => {
          mockOnekeyIdLogout(...args);
        },
        onekeyIdStateTrace: (...args: unknown[]) => {
          mockOnekeyIdStateTrace(...args);
        },
      },
    },
  },
}));

describe('identity exit receipt telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports logout only when the completed receipt says OneKey ID logged out', () => {
    reportIdentityExitReceiptTelemetry({
      intent: {
        type: 'removeKeyless',
        scene: 'accountSelector',
        expectedWalletId: 'wallet-1',
      },
      receipt: { status: 'completed', oneKeyIdLoggedOut: false },
    });

    expect(mockOnekeyIdLogout).not.toHaveBeenCalled();
    expect(mockOnekeyIdStateTrace).toHaveBeenCalledTimes(1);

    reportIdentityExitReceiptTelemetry({
      intent: { type: 'logoutOneKeyId', scene: 'profile' },
      receipt: { status: 'completed', oneKeyIdLoggedOut: true },
    });

    expect(mockOnekeyIdLogout).toHaveBeenCalledWith({
      reason: 'userInitiated',
    });
  });
});
