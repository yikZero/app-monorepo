import { useCallback, useState } from 'react';

import { useIntl } from 'react-intl';

import { Toast } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalAddressRiskCheckRoutes } from '@onekeyhq/shared/src/routes/addressRiskCheck';
import type { IAddressRiskCheckResult } from '@onekeyhq/shared/types/addressRiskCheck';

// Shared entry for running a check: calls the server, records the success into
// local "Recent checks" (failures are never recorded), and navigates to the
// result page. Used by both the input "Check risk" button and recent-item taps.
export function useCheckAddressRisk() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const [isChecking, setIsChecking] = useState(false);

  const checkRisk = useCallback(
    async ({
      networkId,
      address,
    }: {
      networkId: string;
      address: string;
    }): Promise<IAddressRiskCheckResult | undefined> => {
      setIsChecking(true);
      try {
        const result =
          await backgroundApiProxy.serviceAddressRiskCheck.checkAddressRisk({
            networkId,
            address,
          });
        await backgroundApiProxy.simpleDb.addressRiskCheck.addCheck({
          networkId: result.networkId,
          address: result.address,
          level: result.level,
          checkedAt: result.checkedAt,
        });
        navigation.push(EModalAddressRiskCheckRoutes.AddressRiskCheckResult, {
          result,
        });
        return result;
      } catch {
        // Network / rate-limit / server errors. Invalid-address is handled
        // inline on the input form before this call.
        Toast.error({
          title: intl.formatMessage({
            id: ETranslations.global_an_error_occurred,
          }),
          message: intl.formatMessage({
            id: ETranslations.global_an_error_occurred_desc,
          }),
        });
        return undefined;
      } finally {
        setIsChecking(false);
      }
    },
    [intl, navigation],
  );

  return { isChecking, checkRisk };
}
