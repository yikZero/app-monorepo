import type { IBadgeType } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EBtcRewardStatus } from '@onekeyhq/shared/src/referralCode/type';
import { numberFormat } from '@onekeyhq/shared/src/utils/numberUtils';

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
    [EBtcRewardStatus.Wait]: {
      label: intl.formatMessage({
        id: ETranslations.redemption_btc_status_waiting_label,
      }),
      badgeType: 'warning',
      description: intl.formatMessage({
        id: ETranslations.redemption_btc_status_waiting_desc,
      }),
    },
    [EBtcRewardStatus.PendingPayout]: {
      label: intl.formatMessage({ id: ETranslations.referral_pending }),
      badgeType: 'info',
      description: intl.formatMessage({
        id: ETranslations.redemption_btc_status_pending_desc,
      }),
    },
    [EBtcRewardStatus.PayoutInProgress]: {
      label: intl.formatMessage({
        id: ETranslations.redemption_btc_status_distributing_label,
      }),
      badgeType: 'info',
      description: intl.formatMessage({
        id: ETranslations.redemption_btc_status_distributing_desc,
      }),
    },
    [EBtcRewardStatus.Paid]: {
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

// Payouts run on the 10th of each month, UTC, so eligibleAt rounds up to the
// next month-10th.
export function getBtcRewardPayoutDate(eligibleAtIso: string): Date {
  const eligibleAt = new Date(eligibleAtIso);
  const year = eligibleAt.getUTCFullYear();
  const month = eligibleAt.getUTCMonth();
  const sameMonth10th = new Date(Date.UTC(year, month, 10));
  if (sameMonth10th.getTime() >= eligibleAt.getTime()) {
    return sameMonth10th;
  }
  return new Date(Date.UTC(year, month + 1, 10));
}
