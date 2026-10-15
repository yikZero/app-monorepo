import type { ReactNode } from 'react';

import { StyleSheet } from 'react-native';

import {
  Page,
  ScrollView,
  SizableText,
  Skeleton,
  Stack,
  Switch,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import type { INotificationMarketingSubKey } from '@onekeyhq/shared/types/notification';

import { TabSettingsListItem } from '../Tab/ListItem';
import {
  type ISettingsSectionPresentation,
  SETTINGS_PAGE_CONTENT_PADDING_X,
  SETTINGS_TAB_HEADER_TITLE_CONTAINER_STYLE,
  resolveSettingsSectionPresentation,
} from '../Tab/settingsSurface';
import { useSettingsLayout } from '../Tab/useIsTabNavigator';
import { useSettingsPageStyle } from '../Tab/useSettingsPageStyle';

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

// Row metrics follow TabSettingsListItem / TabSettingsListGrid so these pages
// match the rest of Settings on each layout.
export function useNotificationRowLayout() {
  const { isMobileLayout, isTabNavigator } = useSettingsLayout();
  return {
    isMobileLayout,
    insetX: isMobileLayout ? '$4' : '$5',
    titleSize: isTabNavigator ? '$bodyMdMedium' : '$bodyLgMedium',
  } as const;
}

function NotificationSettingsSwitchSkeleton() {
  return <Skeleton w={38} h="$6" radius="round" flexShrink={0} />;
}

export function NotificationSectionTitle({ title }: { title: string }) {
  const { isMobileLayout, insetX } = useNotificationRowLayout();
  // Mobile grouped lists inset the title to the row text; wider layouts align
  // it with the card edge and the page title.
  return (
    <SizableText
      px={isMobileLayout ? insetX : undefined}
      pb={isMobileLayout ? '$2' : '$1.5'}
      size={isMobileLayout ? '$bodyMdMedium' : '$bodySmMedium'}
      color="$textSubdued"
    >
      {title}
    </SizableText>
  );
}

export function NotificationRowDivider() {
  const { insetX } = useNotificationRowLayout();
  return (
    <XStack alignSelf="stretch" pl={insetX}>
      <Stack flex={1} h={StyleSheet.hairlineWidth} bg="$neutral3" />
    </XStack>
  );
}

export function NotificationSwitchRow({
  title,
  description,
  value,
  isLoading,
  onChange,
  disabled,
  onPress,
  testID,
}: {
  title: string;
  description: string;
  value: boolean;
  isLoading: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  // Makes the row a drill-in entry; the switch keeps its own toggle.
  onPress?: () => void;
  testID?: string;
}) {
  const { titleSize } = useNotificationRowLayout();
  return (
    <TabSettingsListItem testID={testID} onPress={onPress} drillIn={!!onPress}>
      <ListItem.Text
        flex={1}
        primary={title}
        primaryTextProps={{ size: titleSize }}
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
          disabled={disabled}
          onChange={onChange}
        />
      )}
    </TabSettingsListItem>
  );
}

// Grey canvas with white grouped cards on every layout.
export function NotificationSettingsPage({
  title,
  children,
}: {
  title: string;
  children: (presentation: ISettingsSectionPresentation) => ReactNode;
}) {
  const { isMobileLayout, isTabNavigator } = useSettingsLayout();
  const resolvedPresentation = resolveSettingsSectionPresentation({
    isMobileLayout,
    isNative: Boolean(platformEnv.isNative),
    isTabNavigator,
  });
  const presentation =
    resolvedPresentation === 'flat' ? 'mobile' : resolvedPresentation;
  const { headerBackgroundColor, headerStyle, pageBackgroundColor } =
    useSettingsPageStyle(true);

  return (
    <Page backgroundColor={pageBackgroundColor}>
      <Page.Header
        {...(headerBackgroundColor
          ? { headerContainerBackgroundColor: headerBackgroundColor }
          : undefined)}
        {...(presentation === 'tab'
          ? {
              headerTitleContainerStyle:
                SETTINGS_TAB_HEADER_TITLE_CONTAINER_STYLE,
            }
          : undefined)}
        headerStyle={headerStyle}
        title={title}
      />
      <Page.Body>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ pb: '$10' }}
        >
          <YStack
            gap={isMobileLayout ? '$5' : '$4'}
            px={SETTINGS_PAGE_CONTENT_PADDING_X}
            pt={isTabNavigator ? undefined : '$3'}
          >
            {children(presentation)}
          </YStack>
        </ScrollView>
      </Page.Body>
    </Page>
  );
}
