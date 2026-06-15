import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import { ActionList, Badge } from '@onekeyhq/components';
import { useOneKeyAuth } from '@onekeyhq/kit/src/components/OneKeyAuth/useOneKeyAuth';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EModalAddressRiskCheckRoutes } from '@onekeyhq/shared/src/routes/addressRiskCheck';
import { EPrimeFeatures, EPrimePages } from '@onekeyhq/shared/src/routes/prime';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';

import { ARC_TEXTS } from '../../../AddressRiskCheck/texts';
import { usePrimeAvailable } from '../../../Prime/hooks/usePrimeAvailable';

export function WalletActionAddressRiskCheck({
  onClose,
}: {
  onClose: () => void;
}) {
  const intl = useIntl();
  const navigation = useAppNavigation();

  const { user, isPrimeActive } = useOneKeyAuth();
  const isPrimeUser = isPrimeActive && user?.onekeyUserId;
  const { isPrimeAvailable } = usePrimeAvailable();

  const handlePress = useCallback(async () => {
    onClose();
    await timerUtils.wait(150);

    if (!isPrimeUser) {
      defaultLogger.prime.subscription.primeEntryClick({
        featureName: EPrimeFeatures.AddressRiskCheck,
        entryPoint: 'moreActions',
        isPrimeActive,
      });
      navigation.pushFullModal(EModalRoutes.PrimeModal, {
        screen: EPrimePages.PrimeDashboard,
        params: {
          fromFeature: EPrimeFeatures.AddressRiskCheck,
        },
      });
      return;
    }

    navigation.pushModal(EModalRoutes.AddressRiskCheckModal, {
      screen: EModalAddressRiskCheckRoutes.AddressRiskCheckInput,
    });
  }, [onClose, isPrimeUser, isPrimeActive, navigation]);

  if (!isPrimeAvailable) {
    return null;
  }

  return (
    <ActionList.Item
      trackID="wallet-action-address-risk-check"
      icon="ShieldKeyholeOutline"
      label={ARC_TEXTS.title}
      onClose={() => {}}
      onPress={handlePress}
      extra={
        isPrimeUser ? null : (
          <Badge badgeSize="sm" badgeType="default">
            <Badge.Text size="$bodySmMedium">
              {intl.formatMessage({
                id: ETranslations.prime_status_prime,
              })}
            </Badge.Text>
          </Badge>
        )
      }
    />
  );
}
