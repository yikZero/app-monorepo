import { useCallback, useState } from 'react';

import { useIntl } from 'react-intl';

import { Button } from '@onekeyhq/components';
import type { IButtonProps } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useHandleAppStateActive } from '@onekeyhq/kit/src/hooks/useHandleAppStateActive';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import {
  type IOsNotificationPermissionAction,
  canSendOsNotificationTest,
  getOsNotificationPermissionSafe,
  recoverOsNotificationPermission,
  resolveOsNotificationPermissionAction,
} from '@onekeyhq/kit/src/utils/notificationPermissionUtils';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { ENotificationPermission } from '@onekeyhq/shared/types/notification';

function getCtaTranslation(
  action: IOsNotificationPermissionAction,
): ETranslations {
  if (action === 'request') {
    return ETranslations.global_enable;
  }
  if (action === 'openSettings') {
    return ETranslations.global_go_to_settings;
  }
  return ETranslations.global_test;
}

function useOsNotificationPermissionAction() {
  const { result: permission, run } = usePromiseResult(
    getOsNotificationPermissionSafe,
    [],
    { undefinedResultIfError: true },
  );

  const reloadPermission = useCallback(() => {
    void run();
  }, [run]);
  useHandleAppStateActive(reloadPermission);

  const action = resolveOsNotificationPermissionAction({
    permission,
    isDesktop: !!platformEnv.isDesktop,
    isWebDappMode: !!platformEnv.isWebDappMode,
  });

  return { action, reloadPermission };
}

function useNotificationHelperCta() {
  const intl = useIntl();
  const { action, reloadPermission } = useOsNotificationPermissionAction();
  const [isBusy, setIsBusy] = useState(false);

  const sendTestNotification = useCallback(async () => {
    await backgroundApiProxy.serviceNotification.showNotification({
      title: intl.formatMessage({
        id: ETranslations.notifications_test_message_title,
      }),
      description: intl.formatMessage({
        id: ETranslations.notifications_test_message_desc,
      }),
    });
  }, [intl]);

  const handlePress = useCallback(async () => {
    setIsBusy(true);
    try {
      if (action === 'none') {
        const allowed = await canSendOsNotificationTest();
        reloadPermission();
        if (allowed) {
          await sendTestNotification();
        }
        return;
      }
      const recovered = await recoverOsNotificationPermission();
      reloadPermission();
      // After a first-time Allow, send the preview immediately so the user
      // does not have to hunt for a second Test tap.
      if (recovered?.permission === ENotificationPermission.granted) {
        await sendTestNotification();
      }
    } finally {
      setIsBusy(false);
    }
  }, [action, reloadPermission, sendTestNotification]);

  return { action, isBusy, handlePress };
}

function NotificationsTestButton({ ...rest }: IButtonProps) {
  const intl = useIntl();
  const { action, isBusy, handlePress } = useNotificationHelperCta();
  const isPermissionCta = action !== 'none';

  return (
    <Button
      testID={
        isPermissionCta
          ? 'setting-notification-permission-btn'
          : 'setting-intl-btn'
      }
      {...rest}
      loading={isBusy || rest.loading}
      onPress={() => {
        void handlePress();
      }}
    >
      {intl.formatMessage({ id: getCtaTranslation(action) })}
    </Button>
  );
}

export default NotificationsTestButton;
