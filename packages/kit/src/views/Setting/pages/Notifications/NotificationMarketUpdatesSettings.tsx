import { Fragment } from 'react';

import { Stack } from '@onekeyhq/components';

import { TabSettingsInsetDivider } from '../Tab/ListItem';

import {
  MARKETING_SUB_ITEMS,
  NOTIFICATION_COPY,
  buildMarketingGroupUpdate,
  getMarketingGroups,
  isMarketingSubEnabled,
} from './notificationCategories';
import {
  NotificationSection,
  NotificationSectionFooter,
  NotificationSettingsPage,
  NotificationSwitchRow,
} from './NotificationSettingsLayout';
import { useNotificationPushSettings } from './useNotificationPushSettings';

export default function NotificationMarketUpdatesSettings() {
  const { settings, updateSettings } = useNotificationPushSettings();
  const isSettingsLoading = settings === undefined;
  const isParentEnabled = getMarketingGroups(settings).marketUpdates;
  const copy = NOTIFICATION_COPY.marketUpdates;

  return (
    <NotificationSettingsPage title={copy.title}>
      <NotificationSection>
        <NotificationSwitchRow
          title={copy.allowTitle}
          description={copy.description}
          value={isParentEnabled}
          isLoading={isSettingsLoading}
          onChange={(checked) =>
            updateSettings(
              buildMarketingGroupUpdate(settings, { marketUpdates: checked }),
            )
          }
        />
      </NotificationSection>

      <Stack>
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
          <NotificationSectionFooter text={copy.disabledHint} />
        )}
      </Stack>
    </NotificationSettingsPage>
  );
}
