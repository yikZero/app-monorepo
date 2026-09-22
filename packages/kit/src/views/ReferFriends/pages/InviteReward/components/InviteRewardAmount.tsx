import { useIntl } from 'react-intl';

import { NumberSizeableText, SizableText } from '@onekeyhq/components';
import type { ISizableTextProps } from '@onekeyhq/components';
import { Currency } from '@onekeyhq/kit/src/components/Currency';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import type { IRewardSummary } from './shared/getRewardSummary';

export function InviteRewardAmount({
  summary,
  size = '$bodyMdMedium',
  emptyLabel = false,
}: {
  summary: IRewardSummary;
  size?: ISizableTextProps['size'];
  emptyLabel?: boolean;
}) {
  const intl = useIntl();

  if (!summary.hasReward) {
    if (!emptyLabel) {
      return null;
    }
    return (
      <SizableText size={size} color="$textSubdued">
        {intl.formatMessage({ id: ETranslations.referral_no_reward })}
      </SizableText>
    );
  }

  if (summary.kind === 'token') {
    return (
      <NumberSizeableText
        size={size}
        formatter="balance"
        formatterOptions={{ tokenSymbol: summary.token?.symbol }}
      >
        {summary.amount}
      </NumberSizeableText>
    );
  }

  return (
    <Currency size={size} formatter="value">
      {summary.fiatValue}
    </Currency>
  );
}
