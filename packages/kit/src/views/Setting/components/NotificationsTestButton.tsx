import { useCallback, useState } from 'react';

import { useIntl } from 'react-intl';

import { Button, XStack } from '@onekeyhq/components';
import type { IButtonProps } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useHandleAppStateActive } from '@onekeyhq/kit/src/hooks/useHandleAppStateActive';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import {
  canSendOsNotificationTest,
  getOsNotificationPermissionSafe,
  recoverOsNotificationPermission,
  resolveOsNotificationPermissionAction,
} from '@onekeyhq/kit/src/utils/notificationPermissionUtils';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

function useOsNotificationPermissionCta() {
  const { result: permission, run } = usePromiseResult(
    getOsNotificationPermissionSafe,
    [],
    { undefinedResultIfError: true },
  );

  const reloadPermission = useCallback(() => {
    void run();
  }, [run]);
  useHandleAppStateActive(reloadPermission);

  const showEnable =
    resolveOsNotificationPermissionAction({
      permission,
      isDesktop: !!platformEnv.isDesktop,
      isWebDappMode: !!platformEnv.isWebDappMode,
    }) !== 'none';

  return { showEnable, reloadPermission };
}

function useNotificationTestActions() {
  const intl = useIntl();
  const { showEnable, reloadPermission } = useOsNotificationPermissionCta();
  const [isEnabling, setIsEnabling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleEnable = useCallback(async () => {
    setIsEnabling(true);
    try {
      await recoverOsNotificationPermission();
      reloadPermission();
    } finally {
      setIsEnabling(false);
    }
  }, [reloadPermission]);

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    try {
      const allowed = await canSendOsNotificationTest();
      reloadPermission();
      if (!allowed) {
        return;
      }
      await backgroundApiProxy.serviceNotification.showNotification({
        title: intl.formatMessage({
          id: ETranslations.notifications_test_message_title,
        }),
        description: intl.formatMessage({
          id: ETranslations.notifications_test_message_desc,
        }),
      });
    } finally {
      setIsTesting(false);
    }
  }, [intl, reloadPermission]);

  return { showEnable, isEnabling, isTesting, handleEnable, handleTest };
}

function NotificationsTestButton({ ...rest }: IButtonProps) {
  const intl = useIntl();
  const { showEnable, isEnabling, isTesting, handleEnable, handleTest } =
    useNotificationTestActions();

  return (
    <XStack gap="$2" alignItems="center" flexShrink={0}>
      {showEnable ? (
        <Button
          testID="setting-notification-permission-btn"
          size={rest.size}
          loading={isEnabling}
          onPress={() => {
            void handleEnable();
          }}
        >
          {intl.formatMessage({ id: ETranslations.global_enable })}
        </Button>
      ) : null}
      <Button
        testID="setting-intl-btn"
        {...rest}
        loading={isTesting || rest.loading}
        onPress={() => {
          void handleTest();
        }}
      >
        {intl.formatMessage({ id: ETranslations.global_test })}
      </Button>
    </XStack>
  );
}

export default NotificationsTestButton;
