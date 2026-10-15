import { Fragment } from 'react';

import { Stack } from '@onekeyhq/components';

import { TabSettingsSection } from '../Tab/ListItem';

import {
  LISTINGS_AND_EVENTS_DESCRIPTION,
  LISTINGS_AND_EVENTS_TITLE,
  MARKETING_SUB_ITEMS,
  NotificationRowDivider,
  NotificationSectionTitle,
  NotificationSettingsPage,
  NotificationSwitchRow,
} from './NotificationSettingsLayout';
import { useNotificationPushSettings } from './useNotificationPushSettings';

export default function NotificationListingsSettings() {
  const { settings, updateSettings } = useNotificationPushSettings();
  const isSettingsLoading = settings === undefined;
  const isParentEnabled = !!settings?.dailyUpdateEnabled;

  return (
    <NotificationSettingsPage title={LISTINGS_AND_EVENTS_TITLE}>
      {(presentation) => (
        <>
          <TabSettingsSection presentation={presentation}>
            <NotificationSwitchRow
              title={LISTINGS_AND_EVENTS_TITLE}
              description={LISTINGS_AND_EVENTS_DESCRIPTION}
              value={isParentEnabled}
              isLoading={isSettingsLoading}
              onChange={(checked) => {
                void updateSettings({
                  dailyUpdateEnabled: checked,
                });
              }}
            />
          </TabSettingsSection>

          <Stack>
            <NotificationSectionTitle
              title={
                isParentEnabled || isSettingsLoading
                  ? 'Choose which products you want listings and highlights for.'
                  : `Turn on ${LISTINGS_AND_EVENTS_TITLE} first.`
              }
            />
            <TabSettingsSection presentation={presentation}>
              {MARKETING_SUB_ITEMS.map((item, index) => (
                <Fragment key={item.key}>
                  {index > 0 ? <NotificationRowDivider /> : null}
                  <NotificationSwitchRow
                    title={item.title}
                    description={item.description}
                    // Sub states are kept while the parent is off.
                    value={settings?.marketingSubs?.[item.key] ?? true}
                    disabled={!isParentEnabled}
                    isLoading={isSettingsLoading}
                    onChange={(checked) => {
                      void updateSettings({
                        marketingSubs: {
                          ...settings?.marketingSubs,
                          [item.key]: checked,
                        },
                      });
                    }}
                  />
                </Fragment>
              ))}
            </TabSettingsSection>
          </Stack>
        </>
      )}
    </NotificationSettingsPage>
  );
}
