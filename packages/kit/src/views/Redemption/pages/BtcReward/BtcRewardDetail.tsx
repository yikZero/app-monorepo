import { useCallback, useMemo } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Alert,
  Badge,
  Divider,
  Empty,
  IconButton,
  Page,
  SizableText,
  Spinner,
  XStack,
  YStack,
  useClipboard,
} from '@onekeyhq/components';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { openTransactionDetailsUrl } from '@onekeyhq/kit/src/utils/explorerUtils';
import { getNetworkIdsMap } from '@onekeyhq/shared/src/config/networkIds';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { formatDate } from '@onekeyhq/shared/src/utils/dateUtils';

import { mockGetRecordDetail } from '../../mockData';
import { EBtcRewardStatus } from '../../types';
import { formatUsd, getBtcRewardStatusConfig } from '../../utils';

import type { RouteProp } from '@react-navigation/core';

type IRouteParams = RouteProp<
  {
    BtcRewardDetail: {
      recordId: string;
    };
  },
  'BtcRewardDetail'
>;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between" alignItems="center" gap="$4">
      <SizableText size="$bodyMd" color="$textSubdued">
        {label}
      </SizableText>
      <SizableText size="$bodyMdMedium" textAlign="right" flexShrink={1}>
        {value}
      </SizableText>
    </XStack>
  );
}

function BtcRewardDetailPage() {
  const intl = useIntl();
  const route = useRoute<IRouteParams>();
  const navigation = useAppNavigation();
  const { recordId } = route.params;
  const { copyText } = useClipboard();

  const { result: record, isLoading } = usePromiseResult(
    () => mockGetRecordDetail(recordId),
    [recordId],
    { watchLoading: true },
  );

  const statusConfigs = useMemo(() => getBtcRewardStatusConfig(intl), [intl]);
  const title = intl.formatMessage({
    id: ETranslations.redemption_btc_detail_title,
  });

  const handleCopyAddress = useCallback(() => {
    if (record?.address) {
      copyText(record.address);
    }
  }, [record?.address, copyText]);

  const handleCopyTxHash = useCallback(() => {
    if (record?.txHash) {
      copyText(record.txHash);
    }
  }, [record?.txHash, copyText]);

  const handleViewOnBaseScan = useCallback(() => {
    if (record?.txHash) {
      void openTransactionDetailsUrl({
        networkId: getNetworkIdsMap().base,
        txid: record.txHash,
      });
    }
  }, [record?.txHash]);

  if (isLoading) {
    return (
      <Page>
        <Page.Header title={title} />
        <Page.Body>
          <YStack flex={1} alignItems="center" justifyContent="center" py="$20">
            <Spinner size="large" />
          </YStack>
        </Page.Body>
      </Page>
    );
  }

  if (!record) {
    return (
      <Page>
        <Page.Header title={title} />
        <Page.Body>
          <YStack flex={1} justifyContent="center" py="$10">
            <Empty
              icon="SearchOutline"
              title={intl.formatMessage({
                id: ETranslations.redemption_btc_detail_not_found_title,
              })}
              description={intl.formatMessage({
                id: ETranslations.redemption_btc_detail_not_found_desc,
              })}
              buttonProps={{
                children: intl.formatMessage({
                  id: ETranslations.shortcut_go_back,
                }),
                onPress: () => navigation.pop(),
              }}
            />
          </YStack>
        </Page.Body>
      </Page>
    );
  }

  const statusConfig = statusConfigs[record.status];
  const isDistributed =
    record.status === EBtcRewardStatus.Distributed && record.distributedAt;
  const rejectReason =
    record.status === EBtcRewardStatus.Rejected
      ? record.rejectReason
      : undefined;

  return (
    <Page scrollEnabled>
      <Page.Header title={title} />
      <Page.Body px="$5" py="$4">
        <YStack gap="$4">
          <YStack
            bg="$bgSubdued"
            borderRadius="$3"
            p="$4"
            alignItems="center"
            gap="$2"
          >
            <Badge badgeType={statusConfig.badgeType} badgeSize="lg">
              <Badge.Text>{statusConfig.label}</Badge.Text>
            </Badge>
            <SizableText size="$heading4xl" textAlign="center" pt="$2">
              {formatUsd(record.usdAmount)}
            </SizableText>
            <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
              {intl.formatMessage(
                { id: ETranslations.redemption_btc_amount_on_base },
                { amount: record.btcAmount },
              )}
            </SizableText>
          </YStack>

          {rejectReason ? (
            <Alert
              type="critical"
              title={intl.formatMessage({
                id: ETranslations.redemption_btc_detail_rejected_alert_title,
              })}
              description={rejectReason}
            />
          ) : (
            <Alert
              type={isDistributed ? 'success' : 'info'}
              icon={
                isDistributed ? 'CheckRadioSolid' : 'ClockTimeHistoryOutline'
              }
              title={statusConfig.label}
              description={statusConfig.description}
            />
          )}

          <YStack bg="$bgSubdued" borderRadius="$3" p="$4" gap="$3">
            <DetailRow
              label={intl.formatMessage({
                id: ETranslations.redemption_btc_label_product,
              })}
              value={record.productName}
            />

            {record.orderId ? (
              <DetailRow
                label={intl.formatMessage({
                  id: ETranslations.Limit_order_history_order_id,
                })}
                value={record.orderId}
              />
            ) : null}

            <DetailRow
              label={intl.formatMessage({
                id: ETranslations.redemption_btc_label_code,
              })}
              value={record.code}
            />

            <DetailRow
              label={intl.formatMessage({
                id: ETranslations.redemption_btc_label_btc_price_locked,
              })}
              value={formatUsd(record.btcPrice)}
            />

            <DetailRow
              label={intl.formatMessage({
                id: ETranslations.redemption_btc_label_submitted,
              })}
              value={formatDate(record.createdAt)}
            />

            {isDistributed && record.distributedAt ? (
              <DetailRow
                label={intl.formatMessage({
                  id: ETranslations.referral_distributed,
                })}
                value={formatDate(record.distributedAt)}
              />
            ) : null}

            <Divider />

            <XStack justifyContent="space-between" alignItems="center" gap="$2">
              <SizableText size="$bodyMd" color="$textSubdued">
                {intl.formatMessage({
                  id: ETranslations.referral_reward_received_address,
                })}
              </SizableText>
              <XStack gap="$1" alignItems="center" flexShrink={1}>
                <SizableText size="$bodyMdMedium" numberOfLines={1}>
                  {accountUtils.shortenAddress({ address: record.address })}
                </SizableText>
                <IconButton
                  variant="tertiary"
                  size="small"
                  icon="Copy3Outline"
                  onPress={handleCopyAddress}
                  title={intl.formatMessage({
                    id: ETranslations.global_copy_address,
                  })}
                />
              </XStack>
            </XStack>

            {isDistributed && record.txHash ? (
              <XStack
                justifyContent="space-between"
                alignItems="center"
                gap="$2"
              >
                <SizableText size="$bodyMd" color="$textSubdued">
                  {intl.formatMessage({
                    id: ETranslations.redemption_btc_label_transaction,
                  })}
                </SizableText>
                <XStack gap="$1" alignItems="center" flexShrink={1}>
                  <SizableText size="$bodyMdMedium" numberOfLines={1}>
                    {accountUtils.shortenAddress({ address: record.txHash })}
                  </SizableText>
                  <IconButton
                    variant="tertiary"
                    size="small"
                    icon="Copy3Outline"
                    onPress={handleCopyTxHash}
                    title={intl.formatMessage({
                      id: ETranslations.redemption_btc_detail_copy_tx_hash,
                    })}
                  />
                  <IconButton
                    variant="tertiary"
                    size="small"
                    icon="OpenOutline"
                    onPress={handleViewOnBaseScan}
                    title={intl.formatMessage({
                      id: ETranslations.global_view_in_blockchain_explorer,
                    })}
                  />
                </XStack>
              </XStack>
            ) : null}
          </YStack>
        </YStack>
      </Page.Body>
    </Page>
  );
}

export default BtcRewardDetailPage;
