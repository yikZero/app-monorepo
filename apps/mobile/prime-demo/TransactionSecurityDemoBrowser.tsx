import { useCallback, useEffect, useRef } from 'react';

import { useIntl } from 'react-intl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, SizableText, Stack, XStack, YStack } from '@onekeyhq/components';
import { BookmarksSectionItem } from '@onekeyhq/kit/src/views/Discovery/pages/Dashboard/BookmarksSectionItem';
import { DashboardSectionHeader } from '@onekeyhq/kit/src/views/Discovery/pages/Dashboard/DashboardSectionHeader';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { PRIME_DEMO_ASSET_URIS } from './assetUris';
import { reportPrimeDemoMarker } from './reportMarker';
import { PrimeDemoTestIDs } from './testIDs';
import { getTransactionSecurityDemoDisplayOrigin } from './transactionSecurityDemoModel';

import type { ITransactionSecurityDemoFixture } from './types';
import type { LayoutChangeEvent } from 'react-native';

export function TransactionSecurityDemoBrowser({
  fixture,
  sceneKey,
  isScreenVisible,
  isDappPrepared,
  onOpenDapp,
}: {
  fixture: ITransactionSecurityDemoFixture;
  sceneKey: string;
  isScreenVisible: boolean;
  isDappPrepared: boolean;
  onOpenDapp: () => void;
}) {
  const intl = useIntl();
  const insets = useSafeAreaInsets();
  const readyReportedRef = useRef(false);
  const layoutRef = useRef<{ width: number; height: number } | null>(null);
  const displayOrigin = getTransactionSecurityDemoDisplayOrigin(fixture);

  const reportReadyIfNeeded = useCallback(() => {
    const layout = layoutRef.current;
    if (
      readyReportedRef.current ||
      !isScreenVisible ||
      !isDappPrepared ||
      !layout ||
      !(layout.width > 0 && layout.height > 0)
    ) {
      return;
    }
    readyReportedRef.current = true;
    reportPrimeDemoMarker({
      name: 'browserReady',
      tMs: 0,
      sceneKey,
      extra: {
        width: layout.width,
        height: layout.height,
        url: displayOrigin,
        dappPrepared: true,
      },
    });
  }, [displayOrigin, isDappPrepared, isScreenVisible, sceneKey]);

  useEffect(() => {
    reportReadyIfNeeded();
  }, [reportReadyIfNeeded]);

  const handleBookmarkLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      layoutRef.current = { width, height };
      reportReadyIfNeeded();
    },
    [reportReadyIfNeeded],
  );

  return (
    <YStack
      flex={1}
      bg="$bgApp"
      pt={insets.top}
      testID={PrimeDemoTestIDs.Browser}
    >
      <YStack px="$5" pt="$2" gap="$5">
        <XStack
          alignItems="center"
          px="$2"
          py="$1.5"
          bg="$bgStrong"
          borderRadius="$3"
          borderCurve="continuous"
        >
          <Icon name="SearchOutline" color="$iconSubdued" size="$5" />
          <SizableText
            pl="$2"
            pb="$1"
            size="$bodyLg"
            color="$textSubdued"
            flex={1}
            numberOfLines={1}
          >
            {intl.formatMessage({
              id: ETranslations.browser_search_dapp_or_enter_url,
            })}
          </SizableText>
        </XStack>
        <YStack>
          <DashboardSectionHeader>
            <DashboardSectionHeader.Heading selected>
              {intl.formatMessage({ id: ETranslations.explore_bookmarks })}
            </DashboardSectionHeader.Heading>
          </DashboardSectionHeader>
          <XStack py="$2">
            <Stack
              testID={PrimeDemoTestIDs.OpenDapp}
              collapsable={false}
              width="25%"
              onLayout={handleBookmarkLayout}
            >
              <BookmarksSectionItem
                logo={PRIME_DEMO_ASSET_URIS.rewards}
                title={fixture.dapp.name}
                url={displayOrigin}
                handleOpenWebSite={() => {
                  onOpenDapp();
                }}
              />
            </Stack>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
