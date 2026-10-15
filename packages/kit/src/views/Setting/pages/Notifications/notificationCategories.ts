import type {
  INotificationMarketingSubKey,
  INotificationPushSettings,
} from '@onekeyhq/shared/types/notification';

// TODO: move copy to Lokalise once the notification categories are final.
export const NOTIFICATION_COPY = {
  walletSection: 'Wallet',
  systemSection: 'System',
  marketsSection: 'Markets & events',
  accountActivity: {
    title: 'Account activity',
    description: 'Sends, receives, swaps, and more.',
  },
  perpsTrading: {
    title: 'Perps trading',
    description: 'Order fills and liquidations.',
  },
  manageAccounts: {
    title: 'Manage accounts',
    description: 'Choose which accounts send notifications.',
  },
  // Covers announcements plus support replies, export results and referral
  // rewards, so it keeps the legacy announcementEnabled field.
  systemNotifications: {
    title: 'System notifications',
    description: 'Announcements, support replies, and referral rewards.',
  },
  priceAlerts: {
    title: 'Price alerts',
    description: 'Big moves on your starred tokens.',
  },
  marketUpdates: {
    title: 'Market updates',
    description: 'New listings, trending tokens, and market moves.',
    allowTitle: 'Allow market updates',
    disabledHint: 'Turn on market updates to choose categories.',
  },
  rewardsAndEvents: {
    title: 'Rewards & events',
    description: 'Campaigns, rewards, and new features.',
  },
} as const;

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
    description: 'New and trending tokens.',
  },
  {
    key: 'defi',
    title: 'DeFi',
    description: 'New earn products and yield opportunities.',
  },
  {
    key: 'market',
    title: 'Market',
    description: 'Market and sector moves.',
  },
];

// A missing sub key means enabled, so new sub categories default on.
export function isMarketingSubEnabled(
  settings: INotificationPushSettings | undefined,
  key: INotificationMarketingSubKey,
) {
  return settings?.marketingSubs?.[key] ?? true;
}

// dailyUpdateEnabled gates both marketing groups, so a group only counts as
// on while the gate is on. Older clients toggle the gate directly.
export function getMarketingGroups(
  settings: INotificationPushSettings | undefined,
) {
  const isGateOn = !!settings?.dailyUpdateEnabled;
  return {
    marketUpdates: isGateOn && (settings?.marketUpdatesEnabled ?? true),
    campaigns: isGateOn && (settings?.campaignsEnabled ?? true),
  };
}

// Writes both groups as shown plus the derived gate, so turning one group on
// never revives the other group behind a closed gate.
export function buildMarketingGroupUpdate(
  settings: INotificationPushSettings | undefined,
  change: { marketUpdates?: boolean; campaigns?: boolean },
): INotificationPushSettings {
  const current = getMarketingGroups(settings);
  const marketUpdates = change.marketUpdates ?? current.marketUpdates;
  const campaigns = change.campaigns ?? current.campaigns;
  return {
    marketUpdatesEnabled: marketUpdates,
    campaignsEnabled: campaigns,
    dailyUpdateEnabled: marketUpdates || campaigns,
  };
}

export function getMarketUpdatesStatus(settings: INotificationPushSettings) {
  if (!getMarketingGroups(settings).marketUpdates) {
    return 'Off';
  }
  const enabledCount = MARKETING_SUB_ITEMS.filter((item) =>
    isMarketingSubEnabled(settings, item.key),
  ).length;
  return enabledCount === MARKETING_SUB_ITEMS.length
    ? 'On'
    : `${enabledCount}/${MARKETING_SUB_ITEMS.length}`;
}
