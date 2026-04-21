import { useCallback, useMemo, useState } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Alert,
  Empty,
  Icon,
  Page,
  SearchBar,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import type { IKeyOfIcons } from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { NetworkAvatar } from '@onekeyhq/kit/src/components/NetworkAvatar';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { getNetworkIdsMap } from '@onekeyhq/shared/src/config/networkIds';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalReferFriendsRoutes } from '@onekeyhq/shared/src/routes';
import type { IBtcRewardCodeInfoParam } from '@onekeyhq/shared/src/routes';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';

import { mockGetLocalWalletAddresses } from '../../mockData';

import type { IBtcRewardWalletAddress } from '../../types';
import type { RouteProp } from '@react-navigation/core';

type IRouteParams = RouteProp<
  {
    BtcRewardSelectAddress: {
      codeInfo: IBtcRewardCodeInfoParam;
      orderId?: string;
      productName?: string;
      preselectedAddressId?: string;
    };
  },
  'BtcRewardSelectAddress'
>;

const WALLET_TYPE_ICONS: Record<
  IBtcRewardWalletAddress['walletType'],
  IKeyOfIcons
> = {
  hw: 'OnekeyDeviceCustom',
  hd: 'WalletCryptoSolid',
  imported: 'Key2Solid',
};

const WALLET_TYPE_SECTION_LABEL_KEYS: Record<
  IBtcRewardWalletAddress['walletType'],
  ETranslations
> = {
  hw: ETranslations.redemption_btc_select_address_section_hw,
  hd: ETranslations.redemption_btc_select_address_section_hd,
  imported: ETranslations.redemption_btc_select_address_section_imported,
};

const WALLET_TYPE_ORDER: IBtcRewardWalletAddress['walletType'][] = [
  'hw',
  'hd',
  'imported',
];

const SEARCH_THRESHOLD = 4;

function SelectAddressPage() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const route = useRoute<IRouteParams>();
  const { codeInfo, orderId, productName, preselectedAddressId } = route.params;

  const addresses = useMemo(() => mockGetLocalWalletAddresses(), []);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (
      preselectedAddressId &&
      addresses.some((a) => a.id === preselectedAddressId)
    ) {
      return preselectedAddressId;
    }
    return null;
  });
  const [searchText, setSearchText] = useState('');

  const baseNetworkId = getNetworkIdsMap().base;

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedId),
    [addresses, selectedId],
  );

  const filteredAddresses = useMemo(() => {
    const trimmed = searchText.trim().toLowerCase();
    if (!trimmed) return addresses;
    return addresses.filter(
      (a) =>
        a.label.toLowerCase().includes(trimmed) ||
        a.address.toLowerCase().includes(trimmed),
    );
  }, [addresses, searchText]);

  const groupedAddresses = useMemo(() => {
    const groups: Record<
      IBtcRewardWalletAddress['walletType'],
      IBtcRewardWalletAddress[]
    > = { hw: [], hd: [], imported: [] };
    for (const addr of filteredAddresses) {
      groups[addr.walletType].push(addr);
    }
    return WALLET_TYPE_ORDER.filter((type) => groups[type].length > 0).map(
      (type) => ({ type, items: groups[type] }),
    );
  }, [filteredAddresses]);

  const handleNext = useCallback(() => {
    if (!selectedAddress) return;

    navigation.push(EModalReferFriendsRoutes.BtcRewardConfirm, {
      codeInfo,
      orderId,
      productName,
      address: selectedAddress.address,
      addressLabel: selectedAddress.label,
    });
  }, [navigation, selectedAddress, codeInfo, orderId, productName]);

  const handleCreateWallet = useCallback(() => {
    navigation.popStack();
  }, [navigation]);

  const hasNoWallets = addresses.length === 0;
  const showSearch = addresses.length >= SEARCH_THRESHOLD;
  const noSearchResults =
    !hasNoWallets && filteredAddresses.length === 0 && searchText.trim() !== '';

  return (
    <Page scrollEnabled>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.redemption_btc_select_address_title,
        })}
      />
      <Page.Body pb="$4">
        {hasNoWallets ? (
          <YStack px="$5" pt="$10">
            <Empty
              icon="WalletCryptoOutline"
              title={intl.formatMessage({
                id: ETranslations.redemption_btc_select_address_empty_title,
              })}
              description={intl.formatMessage({
                id: ETranslations.redemption_btc_select_address_empty_desc,
              })}
              buttonProps={{
                children: intl.formatMessage({
                  id: ETranslations.global_create_wallet,
                }),
                onPress: handleCreateWallet,
              }}
            />
          </YStack>
        ) : (
          <>
            <YStack px="$5" pt="$4" gap="$3">
              <XStack
                bg="$bgInfoSubdued"
                borderRadius="$3"
                px="$3"
                py="$2.5"
                gap="$2.5"
                alignItems="center"
              >
                <NetworkAvatar networkId={baseNetworkId} size="$7" />
                <YStack flex={1}>
                  <SizableText size="$bodyMdMedium">
                    {intl.formatMessage({
                      id: ETranslations.redemption_btc_select_address_network_title,
                    })}
                  </SizableText>
                  <SizableText size="$bodySm" color="$textSubdued">
                    {intl.formatMessage({
                      id: ETranslations.redemption_btc_select_address_network_desc,
                    })}
                  </SizableText>
                </YStack>
              </XStack>

              <Alert
                type="warning"
                title={intl.formatMessage({
                  id: ETranslations.redemption_btc_select_address_alert_title,
                })}
                description={intl.formatMessage({
                  id: ETranslations.redemption_btc_select_address_alert_desc,
                })}
              />
            </YStack>

            {showSearch ? (
              <Stack px="$5" pt="$3" pb="$1">
                <SearchBar
                  placeholder={intl.formatMessage({
                    id: ETranslations.redemption_btc_select_address_search_placeholder,
                  })}
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </Stack>
            ) : null}

            {noSearchResults ? (
              <YStack px="$5" pt="$6">
                <Empty
                  icon="SearchOutline"
                  title={intl.formatMessage({
                    id: ETranslations.global_search_no_results_title,
                  })}
                  description={intl.formatMessage({
                    id: ETranslations.global_search_no_results_desc,
                  })}
                />
              </YStack>
            ) : (
              <YStack pt="$2">
                {groupedAddresses.map(({ type, items }) => (
                  <YStack key={type}>
                    <SizableText
                      size="$headingXs"
                      color="$textSubdued"
                      textTransform="uppercase"
                      px="$5"
                      pt="$3"
                      pb="$1"
                    >
                      {intl.formatMessage({
                        id: WALLET_TYPE_SECTION_LABEL_KEYS[type],
                      })}
                    </SizableText>
                    {items.map((addr) => {
                      const isSelected = selectedId === addr.id;
                      return (
                        <ListItem
                          key={addr.id}
                          title={addr.label}
                          subtitle={accountUtils.shortenAddress({
                            address: addr.address,
                          })}
                          renderAvatar={
                            <Stack position="relative">
                              <Stack
                                bg="$bgStrong"
                                borderRadius="$full"
                                w="$10"
                                h="$10"
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Icon
                                  name={WALLET_TYPE_ICONS[addr.walletType]}
                                  size="$5"
                                  color="$icon"
                                />
                              </Stack>
                              <Stack
                                position="absolute"
                                right={-2}
                                bottom={-2}
                                bg="$bgApp"
                                borderRadius="$full"
                                p="$0.5"
                              >
                                <NetworkAvatar
                                  networkId={baseNetworkId}
                                  size="$4"
                                />
                              </Stack>
                            </Stack>
                          }
                          onPress={() => setSelectedId(addr.id)}
                        >
                          <Icon
                            name={
                              isSelected
                                ? 'CheckRadioSolid'
                                : 'CirclePlaceholderOnOutline'
                            }
                            color={
                              isSelected ? '$iconSuccess' : '$iconDisabled'
                            }
                            size="$5"
                          />
                        </ListItem>
                      );
                    })}
                  </YStack>
                ))}
              </YStack>
            )}
          </>
        )}
      </Page.Body>

      {!hasNoWallets ? (
        <Page.Footer
          onConfirm={handleNext}
          onConfirmText={intl.formatMessage({ id: ETranslations.global_next })}
          confirmButtonProps={{
            disabled: !selectedAddress,
          }}
        />
      ) : null}
    </Page>
  );
}

export default SelectAddressPage;
