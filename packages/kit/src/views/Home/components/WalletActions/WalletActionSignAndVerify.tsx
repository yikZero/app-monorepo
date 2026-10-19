import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import { ActionList } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { useSignAndVerify } from '../../../SignAndVerifyMessage/hooks/useSignAndVerify';

export function WalletActionSignAndVerify({
  onClose,
}: {
  onClose: () => void;
}) {
  const intl = useIntl();
  const { isAvailable, open } = useSignAndVerify();

  const handleSignAndVerify = useCallback(async () => {
    if (open()) {
      onClose();
    }
  }, [open, onClose]);

  if (!isAvailable) {
    return null;
  }

  return (
    <ActionList.Item
      trackID="wallet-action-sign-and-verify"
      icon="SignatureOutline"
      label={intl.formatMessage({
        id: ETranslations.message_signing_main_title,
      })}
      onClose={() => {}}
      onPress={handleSignAndVerify}
    />
  );
}
