import { Fragment } from 'react';

import { Stack } from '@onekeyhq/components';

import { TabSettingsInsetDivider } from '../Tab/ListItem';

import {
  LISTINGS_AND_EVENTS_DESCRIPTION,
  LISTINGS_AND_EVENTS_TITLE,
  MARKETING_SUB_ITEMS,
  isMarketingSubEnabled,
} from './notificationCategories';
import {
  NotificationSection,
  NotificationSectionFooter,
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
      <NotificationSection>
        <NotificationSwitchRow
          title="Allow listings & events"
          description={LISTINGS_AND_EVENTS_DESCRIPTION}
          value={isParentEnabled}
          isLoading={isSettingsLoading}
          onChange={(checked) =>
            updateSettings({ dailyUpdateEnabled: checked })
          }
        />
      </NotificationSection>

      <Stack>
        <NotificationSectionTitle title="Categories" />
        <NotificationSection>
          {MARKETING_SUB_ITEMS.map((item, index) => (
            <Fragment key={item.key}>
              {index > 0 ? <TabSettingsInsetDivider withoutIcon /> : null}
              <NotificationSwitchRow
                title={item.title}
                description={item.description}
                // Sub states are kept while the parent is off.
                value={isMarketingSubEnabled(settings, item.key)}
                disabled={!isParentEnabled}
                isLoading={isSettingsLoading}
                onChange={(checked) =>
                  updateSettings({ marketingSubs: { [item.key]: checked } })
                }
              />
            </Fragment>
          ))}
        </NotificationSection>
        {isParentEnabled || isSettingsLoading ? null : (
          <NotificationSectionFooter text="Turn on listings & events to choose categories." />
        )}
      </Stack>
    </NotificationSettingsPage>
  );
}
