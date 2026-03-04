import { useIntl } from 'react-intl';

import { Alert, YStack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { ESendFeeStatus } from '@onekeyhq/shared/types/fee';

import { useBulkSendReviewContext } from './Context';

type IProps = {
  onRetry: () => void;
};

function BulkSendReviewAlert({ onRetry }: IProps) {
  const intl = useIntl();
  const { feeState } = useBulkSendReviewContext();
  const {
    feeStatus,
    errMessage,
    insufficientSol,
    solBalanceNeeded,
    nativeSymbol,
  } = feeState;

  if (!errMessage && !insufficientSol) {
    return null;
  }

  return (
    <YStack px="$5" gap="$3">
      {errMessage ? (
        <Alert
          icon="ErrorOutline"
          type="critical"
          title={errMessage}
          action={{
            primary: intl.formatMessage({
              id: ETranslations.global_retry,
            }),
            isPrimaryLoading: feeStatus === ESendFeeStatus.Loading,
            isPrimaryDisabled: feeStatus === ESendFeeStatus.Loading,
            onPrimaryPress: onRetry,
          }}
        />
      ) : null}
      {insufficientSol ? (
        <Alert
          icon="ErrorOutline"
          type="critical"
          title={`Insufficient ${nativeSymbol || 'SOL'} balance. You need at least ${solBalanceNeeded ?? '?'} ${nativeSymbol || 'SOL'} to cover network fees and account activation fees.`}
        />
      ) : null}
    </YStack>
  );
}

export default BulkSendReviewAlert;
