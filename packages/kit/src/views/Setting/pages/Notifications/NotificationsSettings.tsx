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
import { TabSettingsListItem, TabSettingsSection } from '../Tab/ListItem';

import {
  LISTINGS_AND_EVENTS_DESCRIPTION,
  LISTINGS_AND_EVENTS_TITLE,
  NotificationRowDivider,
  NotificationSectionTitle,
  NotificationSettingsPage,
  NotificationSwitchRow,
  useNotificationRowLayout,
} from './NotificationSettingsLayout';
import { useNotificationPushSettings } from './useNotificationPushSettings';

function NotificationsSettingsHelper() {
  const intl = useIntl();
  const cta = useNotificationHelperCta();
  const { titleSize } = useNotificationRowLayout();
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
  const { titleSize } = useNotificationRowLayout();
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

  const handleMasterSwitchChange = async (checked: boolean) => {
    void updateSettings({
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
      {(presentation) => (
        <>
          {/* Allow notifications - Master switch */}
          <TabSettingsSection presentation={presentation}>
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
          </TabSettingsSection>

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
              <Stack>
                <NotificationSectionTitle title="Wallet" />
                <TabSettingsSection presentation={presentation}>
                  <NotificationSwitchRow
                    title={intl.formatMessage({
                      id: ETranslations.notifications_notifications_account_activity_label,
                    })}
                    description={intl.formatMessage({
                      id: ETranslations.notifications_notifications_account_activity_desc,
                    })}
                    value={!!settings?.accountActivityPushEnabled}
                    isLoading={isSettingsLoading}
                    onChange={(checked) => {
                      void updateSettings({
                        accountActivityPushEnabled: checked,
                      });
                    }}
                  />
                  <NotificationRowDivider />
                  <NotificationSwitchRow
                    title={intl.formatMessage({
                      id: ETranslations.global_perps_trading,
                    })}
                    description={intl.formatMessage({
                      id: ETranslations.global_update_perp_contract,
                    })}
                    value={!!settings?.perpsEnabled}
                    isLoading={isSettingsLoading}
                    onChange={(checked) => {
                      void updateSettings({
                        perpsEnabled: checked,
                      });
                    }}
                  />
                  <NotificationRowDivider />
                  {/* Manage - Account selection */}
                  <TabSettingsListItem
                    testID="notifications-manage-accounts"
                    titleProps={{ size: titleSize }}
                    title={intl.formatMessage({
                      id: ETranslations.notifications_notifications_account_manage_label,
                    })}
                    subtitle={intl.formatMessage({
                      id: ETranslations.notifications_notifications_account_manage_desc,
                    })}
                    drillIn
                    onPress={() => {
                      navigation.push(
                        EModalSettingRoutes.SettingManageAccountActivity,
                      );
                    }}
                  />
                </TabSettingsSection>
              </Stack>

              {/* System: announcements and person-level service updates */}
              <Stack>
                <NotificationSectionTitle title="System" />
                <TabSettingsSection presentation={presentation}>
                  <NotificationSwitchRow
                    title={intl.formatMessage({
                      id: ETranslations.global_important_announcement,
                    })}
                    description="Security alerts, version updates, and maintenance."
                    value={!!settings?.announcementEnabled}
                    isLoading={isSettingsLoading}
                    onChange={(checked) => {
                      void updateSettings({
                        announcementEnabled: checked,
                      });
                    }}
                  />
                  <NotificationRowDivider />
                  <NotificationSwitchRow
                    title="Service notifications"
                    description="Support replies, referral rewards, and export status."
                    value={settings?.serviceNotificationEnabled ?? true}
                    isLoading={isSettingsLoading}
                    onChange={(checked) => {
                      void updateSettings({
                        serviceNotificationEnabled: checked,
                      });
                    }}
                  />
                </TabSettingsSection>
              </Stack>

              {/* Markets & events: subscribed alerts and marketing pushes */}
              <Stack>
                <NotificationSectionTitle title="Markets & events" />
                <TabSettingsSection presentation={presentation}>
                  {platformEnv.isExtension ? null : (
                    <>
                      <NotificationSwitchRow
                        title={intl.formatMessage({
                          id: ETranslations.global_price_alerts,
                        })}
                        description={intl.formatMessage({
                          id: ETranslations.global_get_alert_token_move,
                        })}
                        value={!!settings?.priceAlertsEnabled}
                        isLoading={isSettingsLoading}
                        onChange={(checked) => {
                          void updateSettings({
                            priceAlertsEnabled: checked,
                          });
                        }}
                      />
                      <NotificationRowDivider />
                    </>
                  )}
                  <NotificationSwitchRow
                    testID="notifications-listings-and-events"
                    title={LISTINGS_AND_EVENTS_TITLE}
                    description={LISTINGS_AND_EVENTS_DESCRIPTION}
                    value={!!settings?.dailyUpdateEnabled}
                    isLoading={isSettingsLoading}
                    onChange={(checked) => {
                      void updateSettings({
                        dailyUpdateEnabled: checked,
                      });
                    }}
                    onPress={() => {
                      navigation.push(
                        EModalSettingRoutes.SettingNotificationsListings,
                      );
                    }}
                  />
                </TabSettingsSection>
              </Stack>

              {/* Push notifications helper */}
              <TabSettingsSection presentation={presentation}>
                <NotificationsSettingsHelper />
              </TabSettingsSection>
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
        </>
      )}
    </NotificationSettingsPage>
  );
}
