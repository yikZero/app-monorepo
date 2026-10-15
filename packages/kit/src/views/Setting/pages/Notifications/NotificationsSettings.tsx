import { useState } from 'react';

import { noop } from 'lodash';
import { useIntl } from 'react-intl';

import { Button, SizableText, Stack, XStack } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { MultipleClickStack } from '@onekeyhq/kit/src/components/MultipleClickStack';
import { NotificationPermissionRecoveryAlert } from '@onekeyhq/kit/src/components/NotificationPermissionRecoveryAlert';
import { showNotificationPermissionsDialog } from '@onekeyhq/kit/src/components/PermissionsDialog';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import {
  useDevSettingsPersistAtom,
  useNotificationsAtom,
  useSettingsPersistAtom,
} from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { EModalRoutes, EModalSettingRoutes } from '@onekeyhq/shared/src/routes';
import { EModalNotificationsRoutes } from '@onekeyhq/shared/src/routes/notifications';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import { ENotificationPermission } from '@onekeyhq/shared/types/notification';

import NotificationsHelpCenterInstruction from '../../components/NotificationsHelpCenterInstruction';
import {
  NotificationHelperCtaButton,
  useNotificationHelperCta,
} from '../../components/NotificationsTestButton';
import {
  TabSettingsInsetDivider,
  TabSettingsListItem,
  useSettingsRowMetrics,
} from '../Tab/ListItem';

import {
  LISTINGS_AND_EVENTS_DESCRIPTION,
  LISTINGS_AND_EVENTS_TITLE,
  getListingsAndEventsStatus,
} from './notificationCategories';
import {
  NotificationLinkRow,
  NotificationSection,
  NotificationSettingsPage,
  NotificationSwitchRow,
} from './NotificationSettingsLayout';
import { useNotificationPushSettings } from './useNotificationPushSettings';

type INotificationSwitchField =
  | 'accountActivityPushEnabled'
  | 'perpsEnabled'
  | 'announcementEnabled'
  | 'serviceNotificationEnabled'
  | 'priceAlertsEnabled';

function NotificationsSettingsHelper() {
  const intl = useIntl();
  const cta = useNotificationHelperCta();
  const { titleSize } = useSettingsRowMetrics();
  let titleId = ETranslations.notifications_settings_helper_title;
  if (!cta.isPending) {
    titleId =
      cta.action === 'none'
        ? ETranslations.notification_preview__title
        : ETranslations.notifications_intro_title;
  }

  return (
    <TabSettingsListItem flexDirection="column" alignItems="stretch" gap="$2">
      <XStack alignItems="center" gap="$3">
        <ListItem.Text
          flex={1}
          minWidth={0}
          primary={intl.formatMessage({ id: titleId })}
          primaryTextProps={{ size: titleSize }}
        />
        <NotificationHelperCtaButton cta={cta} size="small" flexShrink={0} />
      </XStack>
      <Stack gap="$1.5">
        <SizableText maxWidth="$96" size="$bodyMd" color="$textSubdued">
          {intl.formatMessage({
            id: ETranslations.notifications_test_message_desc,
          })}
        </SizableText>
        <NotificationsHelpCenterInstruction size="$bodySm" />
      </Stack>
    </TabSettingsListItem>
  );
}

export default function NotificationsSettings() {
  const intl = useIntl();
  const { settings, updateSettings } = useNotificationPushSettings();
  const [devAppSettings] = useDevSettingsPersistAtom();
  const [appSettings] = useSettingsPersistAtom();
  const [, setNotificationsData] = useNotificationsAtom();
  const navigation = useAppNavigation();
  const [shouldShowDevPanel, setShouldShowDevPanel] = useState(false);
  const isSettingsLoading = settings === undefined;

  const { result: pushClient } = usePromiseResult(() => {
    noop(devAppSettings.enabled);
    return backgroundApiProxy.serviceNotification.getPushClient();
  }, [devAppSettings.enabled]);

  // serviceNotificationEnabled is new, so a missing value means enabled.
  const bindSwitch = (field: INotificationSwitchField) => ({
    value: settings?.[field] ?? field === 'serviceNotificationEnabled',
    isLoading: isSettingsLoading,
    onChange: (checked: boolean) => updateSettings({ [field]: checked }),
  });

  const handleMasterSwitchChange = async (checked: boolean) => {
    updateSettings({
      pushEnabled: checked,
    });
    if (checked) {
      const permission =
        await backgroundApiProxy.serviceNotification.getPermission();
      await timerUtils.wait(300);
      if (
        permission.isSupported &&
        permission.permission !== ENotificationPermission.granted
      ) {
        navigation.pushModal(EModalRoutes.NotificationsModal, {
          screen: EModalNotificationsRoutes.NotificationIntroduction,
        });
      }
    }
  };

  return (
    <NotificationSettingsPage
      title={intl.formatMessage({ id: ETranslations.global_notifications })}
    >
      {/* Allow notifications - Master switch */}
      <NotificationSection>
        <NotificationSwitchRow
          title={intl.formatMessage({
            id: ETranslations.notifications_notifications_switch_label,
          })}
          description={intl.formatMessage({
            id: ETranslations.global_master_switch_all_notification,
          })}
          value={!!settings?.pushEnabled}
          isLoading={isSettingsLoading}
          onChange={(checked) => {
            void handleMasterSwitchChange(checked);
          }}
        />
      </NotificationSection>

      {settings?.pushEnabled ? (
        <NotificationPermissionRecoveryAlert
          scene="settings"
          pushEnabled={settings.pushEnabled}
          showAlert={false}
        />
      ) : null}

      {settings === undefined || settings.pushEnabled ? (
        <>
          {/* Wallet: notifications bound to wallet addresses */}
          <NotificationSection>
            <NotificationSwitchRow
              title={intl.formatMessage({
                id: ETranslations.notifications_notifications_account_activity_label,
              })}
              description={intl.formatMessage({
                id: ETranslations.notifications_notifications_account_activity_desc,
              })}
              {...bindSwitch('accountActivityPushEnabled')}
            />
            <TabSettingsInsetDivider withoutIcon />
            <NotificationSwitchRow
              title={intl.formatMessage({
                id: ETranslations.global_perps_trading,
              })}
              description={intl.formatMessage({
                id: ETranslations.global_update_perp_contract,
              })}
              {...bindSwitch('perpsEnabled')}
            />
            <TabSettingsInsetDivider withoutIcon />
            {/* Manage - Account selection */}
            <NotificationLinkRow
              testID="notifications-manage-accounts"
              title={intl.formatMessage({
                id: ETranslations.notifications_notifications_account_manage_label,
              })}
              description={intl.formatMessage({
                id: ETranslations.notifications_notifications_account_manage_desc,
              })}
              onPress={() => {
                navigation.push(
                  EModalSettingRoutes.SettingManageAccountActivity,
                );
              }}
            />
          </NotificationSection>

          {/* System: announcements and person-level service updates */}
          <NotificationSection>
            <NotificationSwitchRow
              title={intl.formatMessage({
                id: ETranslations.global_important_announcement,
              })}
              description="Security alerts, version updates, and maintenance."
              {...bindSwitch('announcementEnabled')}
            />
            <TabSettingsInsetDivider withoutIcon />
            <NotificationSwitchRow
              title="Service notifications"
              description="Support replies, referral rewards, and export status."
              {...bindSwitch('serviceNotificationEnabled')}
            />
          </NotificationSection>

          {/* Markets & events: subscribed alerts and marketing pushes */}
          <NotificationSection>
            {platformEnv.isExtension ? null : (
              <>
                <NotificationSwitchRow
                  title={intl.formatMessage({
                    id: ETranslations.global_price_alerts,
                  })}
                  description={intl.formatMessage({
                    id: ETranslations.global_get_alert_token_move,
                  })}
                  {...bindSwitch('priceAlertsEnabled')}
                />
                <TabSettingsInsetDivider withoutIcon />
              </>
            )}
            <NotificationLinkRow
              testID="notifications-listings-and-events"
              title={LISTINGS_AND_EVENTS_TITLE}
              description={LISTINGS_AND_EVENTS_DESCRIPTION}
              value={
                settings ? getListingsAndEventsStatus(settings) : undefined
              }
              onPress={() => {
                navigation.push(
                  EModalSettingRoutes.SettingNotificationsListings,
                );
              }}
            />
          </NotificationSection>

          {/* Push notifications helper */}
          <NotificationSection>
            <NotificationsSettingsHelper />
          </NotificationSection>
        </>
      ) : null}

      <MultipleClickStack
        h="$12"
        showDevBgColor
        onPress={() => {
          setShouldShowDevPanel(true);
        }}
      />

      {shouldShowDevPanel ? (
        <Stack p="$5" m="$5" borderRadius="$3" gap="$2" bg="$bgSubdued">
          <SizableText>Dev tools</SizableText>
          <Button
            onPress={showNotificationPermissionsDialog}
            testID="setting-btn"
          >
            通知权限
          </Button>
          <Button
            testID="setting-btn"
            onPress={() => {
              navigation.pushModal(EModalRoutes.NotificationsModal, {
                screen: EModalNotificationsRoutes.NotificationIntroduction,
              });
            }}
          >
            初次引导
          </Button>
          <Button
            testID="setting-btn"
            onPress={() => {
              setNotificationsData((v) => ({
                ...v,
                txHistoryAlertDismissed: undefined,
                swapHistoryAlertDismissed: undefined,
                perpHistoryAlertDismissed: undefined,
              }));
            }}
          >
            重置所有 Alert 状态
          </Button>
          <SizableText>
            InstanceId: {appSettings?.instanceId?.slice(0, 8)}...
          </SizableText>
          <SizableText>
            JPush: {pushClient?.jpushId?.slice(0, 8)}...
          </SizableText>
          <SizableText>
            WebSocket: {pushClient?.socketId?.slice(0, 8)}...
          </SizableText>
        </Stack>
      ) : null}
    </NotificationSettingsPage>
  );
}
