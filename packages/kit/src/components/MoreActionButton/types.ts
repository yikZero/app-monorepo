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
}
