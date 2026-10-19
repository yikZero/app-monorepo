import type { IIconButtonProps } from '@onekeyhq/components';

export interface IMoreActionContentGridItemProps {
  title: IIconButtonProps['title'];
  icon?: IIconButtonProps['icon'];
  testID?: string;
  trackID: string;
  onPress: () => void;
  ignorePress?: boolean;
  showRedDot?: boolean;
  showBadges?: boolean;
  badges?: number;
  lottieSrc?: any;
  isPrimeFeature?: boolean;
  hidePrimeBadge?: boolean;
  subtitle?: string;
}

export const TRAVEL_MODE_IGNORED_MORE_ACTIONS: ReadonlySet<string> = new Set([
  'wallet-customer-support',
  'wallet-lock-now',
  'wallet-backup',
  'wallet-address-book',
  'wallet-network',
  'wallet-referral',
  'wallet-redeem',
]);
