import type {
  INotificationMarketingSubKey,
  INotificationPushSettings,
} from '@onekeyhq/shared/types/notification';

// TODO: move copy to Lokalise once the notification categories are final.
export const LISTINGS_AND_EVENTS_TITLE = 'Listings & events';
export const LISTINGS_AND_EVENTS_DESCRIPTION =
  'New tokens and perps, market highlights, events, and new features.';

export const MARKETING_SUB_ITEMS: {
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

// A missing sub key means enabled, so new sub categories default on.
export function isMarketingSubEnabled(
  settings: INotificationPushSettings | undefined,
  key: INotificationMarketingSubKey,
) {
  return settings?.marketingSubs?.[key] ?? true;
}

export function getListingsAndEventsStatus(
  settings: INotificationPushSettings,
) {
  if (!settings.dailyUpdateEnabled) {
    return 'Off';
  }
  const enabledCount = MARKETING_SUB_ITEMS.filter((item) =>
    isMarketingSubEnabled(settings, item.key),
  ).length;
  return enabledCount === MARKETING_SUB_ITEMS.length
    ? 'On'
    : `${enabledCount}/${MARKETING_SUB_ITEMS.length}`;
}
