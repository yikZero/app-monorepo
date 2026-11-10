import { useCallback, useMemo } from 'react';

import BigNumber from 'bignumber.js';
import { useIntl } from 'react-intl';

import {
  Button,
  NumberSizeableText,
  SizableText,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { CommunityRecognizedBadge } from '@onekeyhq/kit/src/views/Market/components/CommunityRecognizedBadge';
import { ETranslations } from '@onekeyhq/shared/src/locale/enum/translations';
import {
  formatTokenSymbolForDisplay,
  getTokenPriceChangeStyle,
} from '@onekeyhq/shared/src/utils/tokenUtils';
import type { IUniversalSearchV2MarketToken } from '@onekeyhq/shared/types/search';

import { MarketTokenIcon } from '../../Market/components/MarketTokenIcon';
import { BaseMarketTokenPrice } from '../../Market/components/MarketTokenPrice';
import { UniversalSearchTestIDs } from '../testIDs';

import { ContractAddress } from './SearchResultItems/UniversalSearchV2MarketTokenItem';

function TokenCardStat({ label, value }: { label: string; value?: string }) {
  return (
    <XStack jc="space-between" ai="center">
      <SizableText size="$bodyMd" color="$textSubdued">
        {label}
      </SizableText>
      <NumberSizeableText
        size="$bodyMdMedium"
        formatter="marketCap"
        formatterOptions={{ capAtMaxT: true, currency: '$' }}
      >
        {BigNumber(value || 0).gt(0) ? value : '--'}
      </NumberSizeableText>
    </XStack>
  );
}

/**
 * The token a pasted contract address resolves to, shown above every other
 * result with its key stats and a direct way into trading it.
 */
export function UniversalSearchTokenCard({
  item,
  onPress,
}: {
  item: IUniversalSearchV2MarketToken;
  onPress: (item: IUniversalSearchV2MarketToken) => void;
}) {
  const intl = useIntl();
  const {
    logoUrl,
    logoUrls,
    price,
    symbol,
    name,
    address,
    network,
    liquidity,
    marketCap,
    // eslint-disable-next-line camelcase
    volume_24h,
    volume24h,
    priceChange24hPercent,
    communityRecognized,
  } = item.payload;
  const priceChangeStyle = useMemo(
    () =>
      getTokenPriceChangeStyle({ priceChange: Number(priceChange24hPercent) }),
    [priceChange24hPercent],
  );
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  // A pool-less token cannot be traded; the row still opens its detail page.
  const isTradable = BigNumber(liquidity || 0).gt(0);

  return (
    <YStack
      testID={UniversalSearchTestIDs.tokenCard}
      mx="$5"
      mb="$2.5"
      p="$4"
      gap="$3"
      bg="$bgSubdued"
      borderRadius="$3"
      borderCurve="continuous"
      borderWidth={1}
      borderColor="$borderSubdued"
    >
      <XStack ai="center" gap="$3" onPress={handlePress} cursor="pointer">
        <MarketTokenIcon
          uri={logoUrl}
          uris={logoUrls}
          size="md"
          networkId={network}
        />
        <YStack flex={1} minWidth={0}>
          <XStack ai="center" gap="$1" minWidth={0}>
            <SizableText size="$bodyLgMedium" numberOfLines={1} flexShrink={1}>
              {formatTokenSymbolForDisplay(symbol)}
            </SizableText>
            {communityRecognized ? <CommunityRecognizedBadge /> : null}
          </XStack>
          <XStack ai="center" gap="$1" minWidth={0}>
            {name ? (
              <SizableText
                size="$bodySm"
                color="$textSubdued"
                numberOfLines={1}
                flexShrink={1}
              >
                {name}
              </SizableText>
            ) : null}
            <ContractAddress address={address} compact />
          </XStack>
        </YStack>
        <YStack ai="flex-end" flexShrink={0}>
          <BaseMarketTokenPrice
            price={price}
            size="$bodyLgMedium"
            tokenName={name}
            tokenSymbol={symbol}
          />
          {priceChange24hPercent ? (
            <NumberSizeableText
              size="$bodySm"
              formatter="priceChange"
              color={priceChangeStyle.changeColor}
              formatterOptions={{
                showPlusMinusSigns: priceChangeStyle.showPlusMinusSigns,
              }}
            >
              {priceChange24hPercent}
            </NumberSizeableText>
          ) : null}
        </YStack>
      </XStack>
      <YStack gap="$1.5">
        <TokenCardStat
          label={intl.formatMessage({ id: ETranslations.global_market_cap })}
          value={marketCap}
        />
        <TokenCardStat
          label={intl.formatMessage({ id: ETranslations.global_liquidity })}
          value={liquidity}
        />
        <TokenCardStat
          label={intl.formatMessage({
            id: ETranslations.market_twenty_four_hour_volume,
          })}
          // eslint-disable-next-line camelcase
          value={volume24h || volume_24h}
        />
      </YStack>
      {isTradable ? (
        <Button
          testID={UniversalSearchTestIDs.tokenCardTradeBtn}
          variant="primary"
          size="medium"
          onPress={handlePress}
        >
          {intl.formatMessage({ id: ETranslations.global_trade })}
        </Button>
      ) : null}
    </YStack>
  );
}
