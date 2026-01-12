import { useCallback, useMemo, useRef, useState } from 'react';

import BigNumber from 'bignumber.js';
import { isEmpty } from 'lodash';
import { useIntl } from 'react-intl';

import {
  NumberSizeableText,
  SizableText,
  XStack,
  YStack,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useCurrency } from '@onekeyhq/kit/src/components/Currency';
import { ListLoading } from '@onekeyhq/kit/src/components/Loading';
import { Token } from '@onekeyhq/kit/src/components/Token';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import { getTokenPriceChangeStyle } from '@onekeyhq/shared/src/utils/tokenUtils';
import type { IMarketTokenListItem } from '@onekeyhq/shared/types/marketV2';

import { EModalMarketRoutes } from '../../../Market/router';
import { RichBlock } from '../RichBlock/RichBlock';
import { RichTable } from '../RichTable';

// Default tokens to show when user has no favorites (BTC, ETH, BNB)
const DEFAULT_FAVORITE_TOKENS = [
  { chainId: 'btc--0', contractAddress: '', isNative: true },
  { chainId: 'evm--1', contractAddress: '', isNative: true },
  { chainId: 'evm--56', contractAddress: '', isNative: true },
];

interface IFavoriteTokenDisplay {
  chainId: string;
  contractAddress: string;
  isNative: boolean;
  symbol: string;
  name: string;
  logoUrl: string;
  price: number;
  priceChange24h: number;
  marketCap: number;
}

function PopularTrading({ tableLayout }: { tableLayout?: boolean }) {
  const intl = useIntl();
  const currencyInfo = useCurrency();
  const navigation = useAppNavigation();
  const [favoriteTokens, setFavoriteTokens] = useState<IFavoriteTokenDisplay[]>(
    [],
  );

  const initializedRef = useRef(false);

  const columns = useMemo(() => {
    if (tableLayout) {
      return [
        {
          dataIndex: 'symbol',
          title: intl.formatMessage({ id: ETranslations.global_name }),
          render: (
            _: unknown,
            record: IFavoriteTokenDisplay,
            index: number,
          ) => (
            <XStack alignItems="center" gap="$2">
              <SizableText size="$bodyLgMedium" color="$textSubdued">
                {index + 1}
              </SizableText>
              <XStack alignItems="center" gap="$2">
                <Token
                  size="md"
                  tokenImageUri={record.logoUrl}
                  networkId={record.chainId}
                  showNetworkIcon
                />
                <YStack>
                  <SizableText size="$bodyMdMedium">
                    {record.symbol}
                  </SizableText>
                  <SizableText size="$bodyMd" color="$textSubdued">
                    {record.name}
                  </SizableText>
                </YStack>
              </XStack>
            </XStack>
          ),
        },
        {
          dataIndex: 'price',
          title: intl.formatMessage({ id: ETranslations.global_price }),
          render: (_: unknown, record: IFavoriteTokenDisplay) => (
            <NumberSizeableText
              size="$bodyMdMedium"
              formatter="price"
              formatterOptions={{ currency: currencyInfo?.symbol }}
            >
              {record.price ?? '-'}
            </NumberSizeableText>
          ),
        },
        {
          dataIndex: 'priceChange24h',
          title: intl.formatMessage({ id: ETranslations.market_change_24h }),
          render: (_: unknown, record: IFavoriteTokenDisplay) => {
            const { changeColor, showPlusMinusSigns } =
              getTokenPriceChangeStyle({
                priceChange: record.priceChange24h ?? 0,
              });
            return (
              <NumberSizeableText
                formatter="priceChange"
                formatterOptions={{ showPlusMinusSigns }}
                color={changeColor}
                size="$bodyMdMedium"
              >
                {record.priceChange24h ?? '-'}
              </NumberSizeableText>
            );
          },
        },
        {
          dataIndex: 'marketCap',
          title: intl.formatMessage({ id: ETranslations.global_market_cap }),
          render: (_: unknown, record: IFavoriteTokenDisplay) => (
            <NumberSizeableText
              size="$bodyMdMedium"
              formatter="marketCap"
              formatterOptions={{ currency: currencyInfo?.symbol }}
            >
              {new BigNumber(record.marketCap).isNaN() ? '-' : record.marketCap}
            </NumberSizeableText>
          ),
        },
      ];
    }

    return [
      {
        dataIndex: 'symbol',
        title: intl.formatMessage({ id: ETranslations.global_name }),
        render: (_: unknown, record: IFavoriteTokenDisplay, index: number) => (
          <XStack alignItems="center" gap="$2" justifyContent="flex-end">
            <SizableText size="$bodyLgMedium" color="$textSubdued">
              {index + 1}
            </SizableText>
            <XStack alignItems="center" gap="$2">
              <Token
                size="lg"
                tokenImageUri={record.logoUrl}
                networkId={record.chainId}
                showNetworkIcon
              />
              <YStack>
                <SizableText size="$bodyLgMedium">{record.symbol}</SizableText>
                <NumberSizeableText
                  size="$bodyMd"
                  formatter="marketCap"
                  formatterOptions={{ currency: currencyInfo?.symbol }}
                >
                  {new BigNumber(record.marketCap).isNaN()
                    ? '-'
                    : record.marketCap}
                </NumberSizeableText>
              </YStack>
            </XStack>
          </XStack>
        ),
      },
      {
        dataIndex: 'price',
        title: intl.formatMessage({ id: ETranslations.global_price }),
        render: (_: unknown, record: IFavoriteTokenDisplay) => {
          const { changeColor, showPlusMinusSigns } = getTokenPriceChangeStyle({
            priceChange: record.priceChange24h ?? 0,
          });
          return (
            <YStack alignItems="flex-end">
              <NumberSizeableText
                size="$bodyLgMedium"
                formatter="price"
                formatterOptions={{ currency: currencyInfo?.symbol }}
              >
                {record.price ?? '-'}
              </NumberSizeableText>
              <NumberSizeableText
                formatter="priceChange"
                formatterOptions={{ showPlusMinusSigns }}
                color={changeColor}
                size="$bodyMd"
              >
                {record.priceChange24h ?? '-'}
              </NumberSizeableText>
            </YStack>
          );
        },
      },
    ];
  }, [intl, currencyInfo?.symbol, tableLayout]);

  const { isLoading } = usePromiseResult(
    async () => {
      // Get user's favorites from local storage (synced via Prime Cloud Sync)
      const watchList =
        await backgroundApiProxy.serviceMarketV2.getMarketWatchListV2();

      // Use user's favorites if available, otherwise use default tokens
      const targetList =
        watchList.data.length > 0
          ? watchList.data.slice(0, 3).map((item) => ({
              chainId: item.chainId,
              contractAddress: item.contractAddress,
              isNative: item.isNative ?? false,
            }))
          : DEFAULT_FAVORITE_TOKENS;

      const tokenAddressList = targetList.map((item) => ({
        chainId: item.chainId,
        contractAddress: item.contractAddress,
        isNative: item.isNative,
      }));

      const response =
        await backgroundApiProxy.serviceMarketV2.fetchMarketTokenListBatch({
          tokenAddressList,
        });

      // Empty data protection
      if (response.list.length === 0) {
        return;
      }

      // Build a map for quick lookup by chainId + contractAddress
      const tokenMap = new Map<string, IMarketTokenListItem>();
      response.list.forEach((item: IMarketTokenListItem) => {
        const networkId = item.networkId ?? item.chainId ?? '';
        let address = item.address ?? '';

        // Special handling for native tokens (short addresses)
        // API returns short address for native tokens, normalize to empty string
        if (address.length < 30) {
          address = '';
        }

        const key = `${networkId}:${address.toLowerCase()}`;
        tokenMap.set(key, item);
      });

      // Map tokens in the same order as targetList
      const displayTokens: IFavoriteTokenDisplay[] = targetList
        .map((targetItem) => {
          const key = `${
            targetItem.chainId
          }:${targetItem.contractAddress.toLowerCase()}`;
          const item = tokenMap.get(key);

          if (!item) {
            return null;
          }

          return {
            chainId: targetItem.chainId,
            contractAddress: targetItem.contractAddress,
            isNative: targetItem.isNative,
            symbol: item.symbol,
            name: item.name,
            logoUrl: item.logoUrl ?? '',
            price: parseFloat(item.price ?? '0'),
            priceChange24h: parseFloat(item.priceChange24hPercent ?? '0'),
            marketCap: parseFloat(item.marketCap ?? '0'),
          };
        })
        .filter((item): item is IFavoriteTokenDisplay => item !== null);

      setFavoriteTokens(displayTokens);
      initializedRef.current = true;
    },
    [],
    {
      watchLoading: true,
      pollingInterval: timerUtils.getTimeDurationMs({ seconds: 30 }),
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const renderContent = useCallback(() => {
    if (!initializedRef.current && isLoading) {
      return (
        <ListLoading
          listCount={3}
          listContainerProps={{ py: '$0' }}
          listHeaderProps={{ px: '$3' }}
          itemProps={{ px: tableLayout ? '$3' : '$0', mx: '$0' }}
        />
      );
    }

    return (
      <RichTable<IFavoriteTokenDisplay>
        showHeader={!!tableLayout}
        dataSource={favoriteTokens}
        columns={columns}
        keyExtractor={(item) => `${item.chainId}-${item.contractAddress}`}
        estimatedItemSize={56}
        rowProps={
          tableLayout
            ? undefined
            : {
                py: '$0',
                px: '$0',
              }
        }
        onRow={(record) => ({
          onPress: () => {
            const shortCode = networkUtils.getNetworkShortCode({
              networkId: record.chainId,
            });

            navigation.pushModal(EModalRoutes.MarketModal, {
              screen: EModalMarketRoutes.MarketDetailV2,
              params: {
                tokenAddress: record.contractAddress,
                network: shortCode || record.chainId,
                isNative: record.isNative,
              },
            });
          },
        })}
      />
    );
  }, [columns, favoriteTokens, isLoading, navigation, tableLayout]);

  if (initializedRef.current && isEmpty(favoriteTokens)) {
    return null;
  }

  return (
    <RichBlock
      title={intl.formatMessage({ id: ETranslations.global_favorites })}
      content={renderContent()}
      contentContainerProps={{
        px: tableLayout ? '$2' : '$0',
      }}
      plainContentContainer={!tableLayout}
    />
  );
}

export { PopularTrading };
