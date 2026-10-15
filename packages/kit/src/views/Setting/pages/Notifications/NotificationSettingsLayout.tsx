import type { ReactNode } from 'react';

import {
  Page,
  ScrollView,
  SizableText,
  Skeleton,
  Switch,
  YStack,
} from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import {
  TabSettingsListItem,
  TabSettingsSection,
  useSettingsRowMetrics,
} from '../Tab/ListItem';
import {
  SETTINGS_PAGE_CONTENT_PADDING_X,
  SETTINGS_TAB_HEADER_TITLE_CONTAINER_STYLE,
} from '../Tab/settingsSurface';
import { useSettingsLayout } from '../Tab/useIsTabNavigator';
import { useSettingsPageStyle } from '../Tab/useSettingsPageStyle';

// Bright cards on the subdued canvas on every layout, including the flat
// native iPad layout that other settings pages keep borderless.
function useNotificationSectionPresentation() {
  const { isMobileLayout, isTabNavigator } = useSettingsLayout();
  return !isMobileLayout && isTabNavigator && !platformEnv.isNative
    ? 'tab'
    : 'mobile';
}

export function NotificationSection({ children }: { children: ReactNode }) {
  const presentation = useNotificationSectionPresentation();
  return (
    <TabSettingsSection presentation={presentation}>
      {children}
    </TabSettingsSection>
  );
}

// Mobile grouped lists inset section text to the row text; wider layouts align
// it with the card edge and the page title.
function NotificationSectionText({
  text,
  isTitle,
}: {
  text: string;
  isTitle: boolean;
}) {
  const { isMobileLayout } = useSettingsLayout();
  const { paddingX } = useSettingsRowMetrics();
  const spacing = isMobileLayout ? '$2' : '$1.5';
  const titleSize = isMobileLayout ? '$bodyMdMedium' : '$bodySmMedium';
  const footerSize = isMobileLayout ? '$bodyMd' : '$bodySm';
  return (
    <SizableText
      px={isMobileLayout ? paddingX : undefined}
      pb={isTitle ? spacing : undefined}
      pt={isTitle ? undefined : spacing}
      size={isTitle ? titleSize : footerSize}
      color="$textSubdued"
    >
      {text}
    </SizableText>
  );
}

export function NotificationSectionTitle({ title }: { title: string }) {
  return <NotificationSectionText text={title} isTitle />;
}

export function NotificationSectionFooter({ text }: { text: string }) {
  return <NotificationSectionText text={text} isTitle={false} />;
}

function useDescriptionSize() {
  const { isTabNavigator } = useSettingsLayout();
  return isTabNavigator ? '$bodySm' : '$bodyMd';
}

function NotificationRowText({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const { titleSize } = useSettingsRowMetrics();
  const descriptionSize = useDescriptionSize();
  return (
    <ListItem.Text
      flex={1}
      gap="$0.5"
      primary={title}
      primaryTextProps={{ size: titleSize }}
      secondary={description}
      secondaryTextProps={{ size: descriptionSize }}
    />
  );
}

export function NotificationSwitchRow({
  title,
  description,
  value,
  isLoading,
  onChange,
  disabled,
}: {
  title: string;
  description?: string;
  value: boolean;
  isLoading: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <TabSettingsListItem>
      <NotificationRowText title={title} description={description} />
      {isLoading ? (
        <Skeleton w={38} h="$6" radius="round" flexShrink={0} />
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

export function NotificationLinkRow({
  title,
  description,
  value,
  onPress,
  testID,
}: {
  title: string;
  description: string;
  value?: string;
  onPress: () => void;
  testID?: string;
}) {
  const descriptionSize = useDescriptionSize();
  return (
    <TabSettingsListItem testID={testID} onPress={onPress} drillIn>
      <NotificationRowText title={title} description={description} />
      {value ? (
        <SizableText size={descriptionSize} color="$textSubdued">
          {value}
        </SizableText>
      ) : null}
    </TabSettingsListItem>
  );
}

export function NotificationSettingsPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { isMobileLayout, isTabNavigator } = useSettingsLayout();
  const presentation = useNotificationSectionPresentation();
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
            {children}
          </YStack>
        </ScrollView>
      </Page.Body>
    </Page>
  );
}
