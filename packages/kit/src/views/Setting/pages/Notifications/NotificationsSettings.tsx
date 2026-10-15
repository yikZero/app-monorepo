import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { noop } from 'lodash';
import { useIntl } from 'react-intl';
import { StyleSheet } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';

import {
  Button,
  Page,
  ScrollView,
  SizableText,
  Skeleton,
  Stack,
  Switch,
  XStack,
  YStack,
} from '@onekeyhq/components';
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
  usePrimePersistAtom,
  useSettingsPersistAtom,
} from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { EModalRoutes, EModalSettingRoutes } from '@onekeyhq/shared/src/routes';
import { EModalNotificationsRoutes } from '@onekeyhq/shared/src/routes/notifications';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import {
  ENotificationPermission,
  type INotificationMarketingSubKey,
  type INotificationPushSettings,
} from '@onekeyhq/shared/types/notification';

import NotificationsHelpCenterInstruction from '../../components/NotificationsHelpCenterInstruction';
import {
  NotificationHelperCtaButton,
  useNotificationHelperCta,
} from '../../components/NotificationsTestButton';
import { TabSettingsListItem, TabSettingsSection } from '../Tab/ListItem';
import {
  SETTINGS_PAGE_CONTENT_PADDING_X,
  SETTINGS_TAB_HEADER_TITLE_CONTAINER_STYLE,
  resolveSettingsSectionPresentation,
} from '../Tab/settingsSurface';
import { useSettingsLayout } from '../Tab/useIsTabNavigator';
import { useSettingsPageStyle } from '../Tab/useSettingsPageStyle';

type INotificationSettingsCache = {
  identityKey: string;
  settings: INotificationPushSettings;
};

type INotificationSettingsState = {
  identityKey: string | undefined;
  settings: INotificationPushSettings | undefined;
};

let cachedNotificationSettings: INotificationSettingsCache | undefined;

const EMPTY_NOTIFICATION_SETTINGS_DEFAULTS = {
  pushEnabled: false,
  accountActivityPushEnabled: true,
  priceAlertsEnabled: true,
  perpsEnabled: true,
  announcementEnabled: true,
  dailyUpdateEnabled: true,
  serviceNotificationEnabled: true,
} satisfies INotificationPushSettings;

// TODO: move copy to Lokalise once the notification categories are final.
const MARKETING_SUB_ITEMS: {
  key: INotificationMarketingSubKey;
  title: string;
  description: string;
}[] = [
  {
    key: 'perps',
    title: 'Perps',
    description: 'New perps listings and trending markets.',
  },
  {
    key: 'trade',
    title: 'Trade',
    description: 'New tokens and trending tokens.',
  },
  {
    key: 'defi',
    title: 'DeFi',
    description: 'New earn products and yield opportunities.',
  },
  {
    key: 'market',
    title: 'Market',
    description: 'Market and sector movements.',
  },
  {
    key: 'events',
    title: 'Events',
    description: 'Trading competitions, rewards, and new features.',
  },
];

function getCachedNotificationSettings(identityKey: string | undefined) {
  return identityKey && cachedNotificationSettings?.identityKey === identityKey
    ? cachedNotificationSettings.settings
    : undefined;
}

function hasNotificationSettings(
  settings: INotificationPushSettings | undefined,
) {
  return Boolean(settings && Object.keys(settings).length > 0);
}

function updateCachedNotificationSettings({
  identityKey,
  settings,
}: {
  identityKey: string;
  settings: INotificationPushSettings;
}) {
  cachedNotificationSettings = { identityKey, settings };
}

function NotificationSettingsSwitchSkeleton() {
  return <Skeleton w={38} h="$6" radius="round" flexShrink={0} />;
}

// Must match TabSettingsListItem's horizontal padding so section titles and
// dividers line up with the row text inside each card.
function useNotificationRowInsetX() {
  const { isMobileLayout } = useSettingsLayout();
  return {
    insetX: isMobileLayout ? '$4' : '$5',
    // insetX plus the $4 indent drawn by NotificationRowDivider.
    indentedInsetX: isMobileLayout ? '$8' : '$9',
  } as const;
}

function NotificationSectionTitle({ title }: { title: string }) {
  const { insetX } = useNotificationRowInsetX();
  return (
    <SizableText px={insetX} pb="$2" size="$bodyMdMedium" color="$textSubdued">
      {title}
    </SizableText>
  );
}

function NotificationRowDivider({ indented }: { indented?: boolean }) {
  const { insetX } = useNotificationRowInsetX();
  return (
    <XStack alignSelf="stretch" pl={insetX}>
      {indented ? <Stack w="$4" flexShrink={0} /> : null}
      <Stack flex={1} h={StyleSheet.hairlineWidth} bg="$neutral3" />
    </XStack>
  );
}

function NotificationSwitchRow({
  title,
  description,
  value,
  isLoading,
  onChange,
  indented,
}: {
  title: string;
  description: string;
  value: boolean;
  isLoading: boolean;
  onChange: (checked: boolean) => void;
  indented?: boolean;
}) {
  const { insetX, indentedInsetX } = useNotificationRowInsetX();
  return (
    <TabSettingsListItem pl={indented ? indentedInsetX : insetX}>
      <ListItem.Text
        flex={1}
        primary={title}
        secondary={description}
        secondaryTextProps={{
          maxWidth: '$96',
        }}
      />
      {isLoading ? (
        <NotificationSettingsSwitchSkeleton />
      ) : (
        <Switch
          testID="setting-switch"
          size="small"
          value={value}
          onChange={onChange}
        />
      )}
    </TabSettingsListItem>
  );
}

function NotificationsSettingsHelper() {
  const intl = useIntl();
  const cta = useNotificationHelperCta();
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
  const [primePersistAtom] = usePrimePersistAtom();
  let notificationSettingsIdentityKey: string | undefined;
  if (primePersistAtom.onekeyUserId) {
    notificationSettingsIdentityKey = `onekey-id:${primePersistAtom.onekeyUserId}`;
  } else if (
    !primePersistAtom.isLoggedIn &&
    !primePersistAtom.isLoggedInOnServer
  ) {
    notificationSettingsIdentityKey = 'anonymous';
  }
  const [settingsState, setSettingsState] =
    useState<INotificationSettingsState>(() => ({
      identityKey: notificationSettingsIdentityKey,
      settings: getCachedNotificationSettings(notificationSettingsIdentityKey),
    }));
  const settings =
    settingsState.identityKey === notificationSettingsIdentityKey
      ? settingsState.settings
      : undefined;
  const [devAppSettings] = useDevSettingsPersistAtom();
  const [appSettings] = useSettingsPersistAtom();
  const [, setNotificationsData] = useNotificationsAtom();
  const navigation = useAppNavigation();

  const prevSettings = useRef<INotificationPushSettings | undefined>(
    settingsState.settings,
  );
  const [shouldShowDevPanel, setShouldShowDevPanel] = useState(false);
  const pendingSettings = useRef<INotificationPushSettings | undefined>(
    undefined,
  );
  const settingsMutationVersionRef = useRef(0);
  const notificationSettingsIdentityKeyRef = useRef(
    notificationSettingsIdentityKey,
  );
  const previousNotificationSettingsIdentityKeyRef = useRef(
    notificationSettingsIdentityKey,
  );

  useEffect(() => {
    notificationSettingsIdentityKeyRef.current =
      notificationSettingsIdentityKey;
  }, [notificationSettingsIdentityKey]);

  const { result: pushClient } = usePromiseResult(() => {
    noop(devAppSettings.enabled);
    return backgroundApiProxy.serviceNotification.getPushClient();
  }, [devAppSettings.enabled]);

  const reloadSettings = useCallback(
    async (updated?: INotificationPushSettings) => {
      if (!notificationSettingsIdentityKey) {
        return;
      }
      const requestMutationVersion = settingsMutationVersionRef.current;
      const result =
        updated ||
        (await backgroundApiProxy.serviceNotification.fetchServerNotificationSettings());
      if (
        !updated &&
        requestMutationVersion !== settingsMutationVersionRef.current
      ) {
        return;
      }
      if (
        notificationSettingsIdentityKeyRef.current !==
        notificationSettingsIdentityKey
      ) {
        return;
      }
      // An explicit empty object is a loaded empty config, not a missing payload.
      if (
        (result === undefined || result === null) &&
        hasNotificationSettings(
          getCachedNotificationSettings(notificationSettingsIdentityKey),
        )
      ) {
        return;
      }
      const nextSettings = result ?? {};
      updateCachedNotificationSettings({
        identityKey: notificationSettingsIdentityKey,
        settings: nextSettings,
      });
      setSettingsState({
        identityKey: notificationSettingsIdentityKey,
        settings: nextSettings,
      });
      prevSettings.current = nextSettings;
    },
    [notificationSettingsIdentityKey],
  );

  const isUpdating = useRef(false);
  const doUpdateSettingsToServerRef = useRef<(() => Promise<void>) | undefined>(
    undefined,
  );

  const doUpdateSettingsToServer = useCallback(async () => {
    if (
      !notificationSettingsIdentityKey ||
      notificationSettingsIdentityKeyRef.current !==
        notificationSettingsIdentityKey ||
      isUpdating.current ||
      !pendingSettings.current
    ) {
      return;
    }
    isUpdating.current = true;
    const settingsToUpdate = pendingSettings.current;
    pendingSettings.current = undefined;

    try {
      const updated =
        await backgroundApiProxy.serviceNotification.updateServerNotificationSettings(
          settingsToUpdate,
        );
      // Check if there are new pending settings during the request
      if (pendingSettings.current) {
        // If there are new pending settings, continue updating
        isUpdating.current = false;
        void doUpdateSettingsToServerRef.current?.();
      } else {
        await reloadSettings(updated);
        isUpdating.current = false;
      }
    } catch (e) {
      isUpdating.current = false;
      if (
        notificationSettingsIdentityKeyRef.current ===
          notificationSettingsIdentityKey &&
        prevSettings.current
      ) {
        updateCachedNotificationSettings({
          identityKey: notificationSettingsIdentityKey,
          settings: prevSettings.current,
        });
        setSettingsState({
          identityKey: notificationSettingsIdentityKey,
          settings: prevSettings.current,
        });
      }
      if (pendingSettings.current) {
        void doUpdateSettingsToServerRef.current?.();
      }
      throw e;
    }
  }, [notificationSettingsIdentityKey, reloadSettings]);

  useEffect(() => {
    doUpdateSettingsToServerRef.current = doUpdateSettingsToServer;
  }, [doUpdateSettingsToServer]);

  const updateSettingsToServer = useDebouncedCallback(
    () => {
      void doUpdateSettingsToServer();
    },
    2000,
    {
      leading: false,
      trailing: true,
    },
  );
  const updateSettingsToServerRef = useRef(updateSettingsToServer);

  useEffect(() => {
    updateSettingsToServerRef.current = updateSettingsToServer;
  }, [updateSettingsToServer]);

  const updateSettings = useCallback(
    (partSettings: INotificationPushSettings) => {
      if (!notificationSettingsIdentityKey) {
        return;
      }
      settingsMutationVersionRef.current += 1;
      setSettingsState((v) => {
        if (v.identityKey !== notificationSettingsIdentityKey || !v.settings) {
          return v;
        }
        const currentSettings = hasNotificationSettings(v.settings)
          ? v.settings
          : EMPTY_NOTIFICATION_SETTINGS_DEFAULTS;
        const newValue = {
          ...currentSettings,
          ...partSettings,
        };
        updateCachedNotificationSettings({
          identityKey: notificationSettingsIdentityKey,
          settings: newValue,
        });
        pendingSettings.current = newValue;
        updateSettingsToServer();
        return {
          identityKey: notificationSettingsIdentityKey,
          settings: newValue,
        };
      });
    },
    [notificationSettingsIdentityKey, updateSettingsToServer],
  );

  useEffect(() => {
    const previousIdentityKey =
      previousNotificationSettingsIdentityKeyRef.current;
    const identityChanged =
      previousIdentityKey !== notificationSettingsIdentityKey;
    previousNotificationSettingsIdentityKeyRef.current =
      notificationSettingsIdentityKey;
    const hasOutstandingUpdate = Boolean(
      pendingSettings.current || isUpdating.current,
    );
    if (!identityChanged && hasOutstandingUpdate) {
      return;
    }
    settingsMutationVersionRef.current += 1;
    if (identityChanged) {
      if (
        previousIdentityKey &&
        hasOutstandingUpdate &&
        prevSettings.current !== undefined
      ) {
        updateCachedNotificationSettings({
          identityKey: previousIdentityKey,
          settings: prevSettings.current,
        });
      }
      updateSettingsToServer.cancel();
      pendingSettings.current = undefined;
      const cachedSettings = getCachedNotificationSettings(
        notificationSettingsIdentityKey,
      );
      setSettingsState({
        identityKey: notificationSettingsIdentityKey,
        settings: cachedSettings,
      });
      prevSettings.current = cachedSettings;
    }
    if (notificationSettingsIdentityKey) {
      void reloadSettings();
    }
  }, [
    notificationSettingsIdentityKey,
    primePersistAtom.isLoggedIn,
    primePersistAtom.isLoggedInOnServer,
    primePersistAtom.primeSubscription?.isActive,
    reloadSettings,
    updateSettingsToServer,
  ]);

  // Flush pending settings only when the component actually unmounts.
  useEffect(
    () => () => {
      if (pendingSettings.current) {
        updateSettingsToServerRef.current.flush();
      }
    },
    [],
  );

  const { isMobileLayout, isTabNavigator } = useSettingsLayout();
  const resolvedSectionPresentation = resolveSettingsSectionPresentation({
    isMobileLayout,
    isNative: Boolean(platformEnv.isNative),
    isTabNavigator,
  });
  // Always use bright cards on the subdued canvas, including the flat layout.
  const sectionPresentation =
    resolvedSectionPresentation === 'flat'
      ? 'mobile'
      : resolvedSectionPresentation;
  const { headerBackgroundColor, headerStyle, pageBackgroundColor } =
    useSettingsPageStyle(true);
  const isSettingsLoading = settings === undefined;

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
    <Page backgroundColor={pageBackgroundColor}>
      <Page.Header
        {...(headerBackgroundColor
          ? { headerContainerBackgroundColor: headerBackgroundColor }
          : undefined)}
        {...(sectionPresentation === 'tab'
          ? {
              headerTitleContainerStyle:
                SETTINGS_TAB_HEADER_TITLE_CONTAINER_STYLE,
            }
          : undefined)}
        headerStyle={headerStyle}
        title={intl.formatMessage({ id: ETranslations.global_notifications })}
      />
      <Page.Body>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ pb: '$10' }}
        >
          <YStack
            gap="$5"
            px={SETTINGS_PAGE_CONTENT_PADDING_X}
            pt={isTabNavigator ? undefined : '$3'}
          >
            {/* Allow notifications - Master switch */}
            <TabSettingsSection presentation={sectionPresentation}>
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
                <YStack>
                  <NotificationSectionTitle title="Wallet" />
                  <TabSettingsSection presentation={sectionPresentation}>
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
                </YStack>

                {/* System: announcements and person-level service updates */}
                <YStack>
                  <NotificationSectionTitle title="System" />
                  <TabSettingsSection presentation={sectionPresentation}>
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
                </YStack>

                {/* Markets & events: subscribed alerts and marketing pushes */}
                <YStack>
                  <NotificationSectionTitle title="Markets & events" />
                  <TabSettingsSection presentation={sectionPresentation}>
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
                      title="Listings & events"
                      description="New tokens and perps, market highlights, events, and new features."
                      value={!!settings?.dailyUpdateEnabled}
                      isLoading={isSettingsLoading}
                      onChange={(checked) => {
                        void updateSettings({
                          dailyUpdateEnabled: checked,
                        });
                      }}
                    />
                    {settings?.dailyUpdateEnabled
                      ? MARKETING_SUB_ITEMS.map((item) => (
                          <Fragment key={item.key}>
                            <NotificationRowDivider indented />
                            <NotificationSwitchRow
                              indented
                              title={item.title}
                              description={item.description}
                              value={settings.marketingSubs?.[item.key] ?? true}
                              isLoading={isSettingsLoading}
                              onChange={(checked) => {
                                void updateSettings({
                                  marketingSubs: {
                                    ...settings.marketingSubs,
                                    [item.key]: checked,
                                  },
                                });
                              }}
                            />
                          </Fragment>
                        ))
                      : null}
                  </TabSettingsSection>
                </YStack>

                {/* Push notifications helper */}
                <TabSettingsSection presentation={sectionPresentation}>
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
                      screen:
                        EModalNotificationsRoutes.NotificationIntroduction,
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
          </YStack>
        </ScrollView>
      </Page.Body>
    </Page>
  );
}
