import { useCallback } from 'react';

import { Dialog, Empty, Page, ScrollView, YStack } from '@onekeyhq/components';
import HeaderIconButton from '@onekeyhq/components/src/layouts/Navigation/Header/HeaderIconButton';
import type { IAddressRiskCheckRecentItem } from '@onekeyhq/shared/types/addressRiskCheck';

import { RecentCheckItem } from '../components/RecentCheckItem';
import { useCheckAddressRisk } from '../hooks/useCheckAddressRisk';
import { useRecentChecks } from '../hooks/useRecentChecks';
import { ARC_TEXTS } from '../texts';

function AddressRiskCheckHistory() {
  const { items, networkNameMap, deleteOne, clearAll } = useRecentChecks();
  const { checkRisk } = useCheckAddressRisk();

  const handlePress = useCallback(
    (item: IAddressRiskCheckRecentItem) => {
      void checkRisk({ networkId: item.networkId, address: item.address });
    },
    [checkRisk],
  );

  const handleClearAll = useCallback(() => {
    Dialog.show({
      title: ARC_TEXTS.clearHistoryTitle,
      description: ARC_TEXTS.clearHistoryDescription,
      tone: 'destructive',
      icon: 'DeleteOutline',
      onConfirm: async () => {
        await clearAll();
      },
    });
  }, [clearAll]);

  const headerRight = useCallback(
    () =>
      items.length ? (
        <HeaderIconButton icon="BroomOutline" onPress={handleClearAll} />
      ) : null,
    [items.length, handleClearAll],
  );

  return (
    <Page>
      <Page.Header title={ARC_TEXTS.historyTitle} headerRight={headerRight} />
      <Page.Body>
        {items.length ? (
          <ScrollView>
            <YStack py="$2">
              {items.map((item) => (
                <RecentCheckItem
                  key={`${item.networkId}_${item.address}`}
                  item={item}
                  networkName={networkNameMap[item.networkId]}
                  onPress={handlePress}
                  onDelete={deleteOne}
                />
              ))}
            </YStack>
          </ScrollView>
        ) : (
          <Empty
            icon="ClockTimeHistoryOutline"
            title={ARC_TEXTS.historyEmptyTitle}
            description={ARC_TEXTS.historyEmptyDescription}
          />
        )}
      </Page.Body>
    </Page>
  );
}

export default AddressRiskCheckHistory;
