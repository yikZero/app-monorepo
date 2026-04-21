import type { IBadgeType } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { numberFormat } from '@onekeyhq/shared/src/utils/numberUtils';

import { EBtcRewardStatus } from './types';

import type { useIntl } from 'react-intl';

export interface IBtcRewardStatusConfig {
  label: string;
  badgeType: IBadgeType;
  description: string;
}

export function getBtcRewardStatusConfig(
  intl: ReturnType<typeof useIntl>,
): Record<EBtcRewardStatus, IBtcRewardStatusConfig> {
  return {
    [EBtcRewardStatus.Waiting]: {
      label: intl.formatMessage({
        id: ETranslations.redemption_btc_status_waiting_label,
      }),
      badgeType: 'warning',
      description: intl.formatMessage({
        id: ETranslations.redemption_btc_status_waiting_desc,
      }),
    },
    [EBtcRewardStatus.PendingDistribution]: {
      label: intl.formatMessage({ id: ETranslations.referral_pending }),
      badgeType: 'info',
      description: intl.formatMessage({
        id: ETranslations.redemption_btc_status_pending_desc,
      }),
    },
    [EBtcRewardStatus.Distributing]: {
      label: intl.formatMessage({
        id: ETranslations.redemption_btc_status_distributing_label,
      }),
      badgeType: 'info',
      description: intl.formatMessage({
        id: ETranslations.redemption_btc_status_distributing_desc,
      }),
    },
    [EBtcRewardStatus.Distributed]: {
      label: intl.formatMessage({ id: ETranslations.referral_distributed }),
      badgeType: 'success',
      description: intl.formatMessage({
        id: ETranslations.redemption_btc_status_distributed_desc,
      }),
    },
    [EBtcRewardStatus.Rejected]: {
      label: intl.formatMessage({
        id: ETranslations.redemption_btc_status_rejected_label,
      }),
      badgeType: 'critical',
      description: intl.formatMessage({
        id: ETranslations.redemption_btc_status_rejected_desc,
      }),
    },
  };
}

export function formatUsd(value: number | string): string {
  return numberFormat(String(value), {
    formatter: 'price',
    formatterOptions: { currency: '$' },
  });
}
