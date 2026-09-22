import { useMemo } from 'react';

import { useIntl } from 'react-intl';

import { SizableText } from '@onekeyhq/components';

import { useCurrentLevelCard } from './CurrentLevelCard/hooks/useCurrentLevelCard';
import {
  getInviteValueLine,
  selectInviteValueLineItems,
} from './getInviteValueLine';

import type { ICurrentLevelCardProps } from './CurrentLevelCard/types';

export function InviteValueLine(props: ICurrentLevelCardProps) {
  const intl = useIntl();
  const { commissionRates } = useCurrentLevelCard(props);
  const line = useMemo(() => {
    const items = selectInviteValueLineItems({
      commissionRates: commissionRates.map((item) => ({
        subject: item.subject,
        you: item.rate.you,
        enabled: item.rate.enabled,
      })),
      configs: props.rebateConfig.configs,
    });
    return getInviteValueLine(items, intl.locale);
  }, [commissionRates, intl.locale, props.rebateConfig.configs]);

  if (!line) {
    return null;
  }

  return (
    <SizableText size="$bodyMd" color="$textSubdued">
      {line}
    </SizableText>
  );
}
