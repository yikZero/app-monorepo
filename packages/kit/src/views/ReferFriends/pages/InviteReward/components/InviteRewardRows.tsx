import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { useIntl } from 'react-intl';

import {
  Icon,
  SizableText,
  XStack,
  YStack,
  useMedia,
} from '@onekeyhq/components';
import type { IKeyOfIcons } from '@onekeyhq/components';
import { Currency } from '@onekeyhq/kit/src/components/Currency';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useNavigateToEarnReward } from '@onekeyhq/kit/src/views/ReferFriends/pages/EarnReward/hooks/useNavigateToEarnReward';
import { useNavigateToHardwareSalesReward } from '@onekeyhq/kit/src/views/ReferFriends/pages/HardwareSalesReward/hooks/useNavigateToHardwareSalesReward';
import { useNavigateToPerpsReward } from '@onekeyhq/kit/src/views/ReferFriends/pages/PerpsReward/hooks/useNavigateToPerpsReward';
import { useNavigateToSwapReward } from '@onekeyhq/kit/src/views/ReferFriends/pages/SwapReward/hooks/useNavigateToSwapReward';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IInviteSummary } from '@onekeyhq/shared/src/referralCode/type';

import { getInviteLayoutCopy } from './getInviteLayoutCopy';
import {
  type IInviteRewardRow,
  type IInviteRewardSubject,
  getInviteRewardRows,
} from './getInviteRewardRows';
import { InviteRewardAmount } from './InviteRewardAmount';

const SUBJECT_ICON: Record<IInviteRewardSubject, IKeyOfIcons> = {
  hardware: 'OnekeyLiteOutline',
  perps: 'TradeOutline',
  swap: 'SwitchHorOutline',
  defi: 'CoinsOutline',
};

const SUBJECT_TITLE: Record<IInviteRewardSubject, ETranslations> = {
  hardware: ETranslations.referral_referred_type_3,
  perps: ETranslations.referral_perps,
  swap: ETranslations.swap_referral_link__title,
  defi: ETranslations.referral_referred_type_2,
};

function HardwareSubtitle({
  row,
  monthlyLabel,
  pendingLabel,
}: {
  row: IInviteRewardRow;
  monthlyLabel: string;
  pendingLabel: string;
}) {
  const pending = row.pending?.hasReward ? row.pending : null;
  if (!row.monthlySalesFiatValue && !pending) {
    return null;
  }

  return (
    <XStack ai="center" gap="$1" flexWrap="wrap">
      {row.monthlySalesFiatValue ? (
        <XStack ai="center" gap="$1">
          <SizableText size="$bodySm" color="$textSubdued">
            {monthlyLabel}
          </SizableText>
          <Currency size="$bodySm" formatter="value">
            {row.monthlySalesFiatValue}
          </Currency>
        </XStack>
      ) : null}
      {row.monthlySalesFiatValue && pending ? (
        <SizableText size="$bodySm" color="$textSubdued">
          ·
        </SizableText>
      ) : null}
      {pending ? (
        <XStack ai="center" gap="$1">
          <SizableText size="$bodySm" color="$textSubdued">
            {pendingLabel}
          </SizableText>
          <InviteRewardAmount summary={pending} size="$bodySm" />
        </XStack>
      ) : null}
    </XStack>
  );
}

function RewardListRow({
  row,
  title,
  subtitle,
  onPress,
}: {
  row: IInviteRewardRow;
  title: string;
  subtitle?: ReactNode;
  onPress: () => void;
}) {
  return (
    <ListItem
      mx="$0"
      px="$0"
      icon={SUBJECT_ICON[row.subject]}
      title={title}
      subtitle={subtitle}
      drillIn
      onPress={onPress}
    >
      <InviteRewardAmount summary={row.available} emptyLabel />
    </ListItem>
  );
}

function DesktopRewardRow({
  row,
  title,
  monthlyLabel,
  pendingLabel,
  availableLabel,
  viewDetails,
  onPress,
}: {
  row: IInviteRewardRow;
  title: string;
  monthlyLabel: string;
  pendingLabel: string;
  availableLabel: string;
  viewDetails: string;
  onPress: () => void;
}) {
  return (
    <XStack ai="center" gap="$3" py="$3" cursor="pointer" onPress={onPress}>
      <Icon
        name={SUBJECT_ICON[row.subject]}
        size="$5"
        color="$iconSubdued"
        flexShrink={0}
      />
      <SizableText flex={1} size="$bodyLgMedium" numberOfLines={1}>
        {title}
      </SizableText>
      {row.subject === 'hardware' && row.monthlySalesFiatValue ? (
        <YStack minWidth={96} gap="$0.5">
          <SizableText size="$bodySm" color="$textSubdued">
            {monthlyLabel}
          </SizableText>
          <Currency size="$bodyMdMedium" formatter="value">
            {row.monthlySalesFiatValue}
          </Currency>
        </YStack>
      ) : null}
      <YStack minWidth={96} ai="flex-end" gap="$0.5">
        <SizableText size="$bodySm" color="$textSubdued">
          {availableLabel}
        </SizableText>
        <InviteRewardAmount summary={row.available} emptyLabel />
      </YStack>
      {row.subject === 'hardware' && row.pending?.hasReward ? (
        <YStack minWidth={96} ai="flex-end" gap="$0.5">
          <SizableText size="$bodySm" color="$textSubdued">
            {pendingLabel}
          </SizableText>
          <InviteRewardAmount summary={row.pending} emptyLabel />
        </YStack>
      ) : null}
      <SizableText size="$bodyMd" color="$textSubdued">
        {`${viewDetails} ›`}
      </SizableText>
    </XStack>
  );
}

function useOpenInviteRewardSubject(earnTitle: string) {
  const navigateToHardwareSalesReward = useNavigateToHardwareSalesReward();
  const navigateToPerpsReward = useNavigateToPerpsReward();
  const navigateToSwapReward = useNavigateToSwapReward();
  const navigateToEarnReward = useNavigateToEarnReward();

  return useCallback(
    (subject: IInviteRewardSubject) => {
      if (subject === 'hardware') {
        navigateToHardwareSalesReward();
        return;
      }
      if (subject === 'perps') {
        void navigateToPerpsReward();
        return;
      }
      if (subject === 'swap') {
        navigateToSwapReward();
        return;
      }
      navigateToEarnReward(earnTitle);
    },
    [
      earnTitle,
      navigateToEarnReward,
      navigateToHardwareSalesReward,
      navigateToPerpsReward,
      navigateToSwapReward,
    ],
  );
}

export function InviteRewardRows({
  summaryInfo,
}: {
  summaryInfo: IInviteSummary;
}) {
  const intl = useIntl();
  const { md } = useMedia();
  const [isFoldedOpen, setIsFoldedOpen] = useState(false);
  const copy = getInviteLayoutCopy(intl.locale);
  const rows = useMemo(() => getInviteRewardRows(summaryInfo), [summaryInfo]);
  const openSubject = useOpenInviteRewardSubject(
    summaryInfo.Onchain.title || '',
  );
  const titleFor = useCallback(
    (subject: IInviteRewardSubject) =>
      intl.formatMessage({ id: SUBJECT_TITLE[subject] }),
    [intl],
  );
  const monthlyLabel = intl.formatMessage({
    id: ETranslations.referral_hw_sales_title,
  });
  const pendingLabel = intl.formatMessage({
    id: ETranslations.referral_sales_reward_pending,
  });
  const availableLabel = intl.formatMessage({
    id: ETranslations.referral_undistributed,
  });
  const noRewardLabel = intl.formatMessage({
    id: ETranslations.referral_no_reward,
  });
  const foldedTitle = rows.foldedRows
    .map((row) => titleFor(row.subject))
    .join(' · ');

  return (
    <YStack px="$pagePadding" pt="$4">
      <SizableText size="$headingLg" pb="$2">
        {copy.rewardDetails}
      </SizableText>
      {rows.visibleRows.map((row) =>
        md ? (
          <RewardListRow
            key={row.subject}
            row={row}
            title={titleFor(row.subject)}
            subtitle={
              row.subject === 'hardware' ? (
                <HardwareSubtitle
                  row={row}
                  monthlyLabel={monthlyLabel}
                  pendingLabel={pendingLabel}
                />
              ) : undefined
            }
            onPress={() => {
              openSubject(row.subject);
            }}
          />
        ) : (
          <DesktopRewardRow
            key={row.subject}
            row={row}
            title={titleFor(row.subject)}
            monthlyLabel={monthlyLabel}
            pendingLabel={pendingLabel}
            availableLabel={availableLabel}
            viewDetails={copy.viewDetails}
            onPress={() => {
              openSubject(row.subject);
            }}
          />
        ),
      )}
      {rows.foldedRows.length > 0 ? (
        <ListItem
          mx="$0"
          px="$0"
          title={foldedTitle}
          drillIn
          onPress={() => {
            setIsFoldedOpen((open) => !open);
          }}
        >
          <SizableText size="$bodyMd" color="$textSubdued">
            {noRewardLabel}
          </SizableText>
        </ListItem>
      ) : null}
      {isFoldedOpen
        ? rows.foldedRows.map((row) => (
            <RewardListRow
              key={row.subject}
              row={row}
              title={titleFor(row.subject)}
              onPress={() => {
                openSubject(row.subject);
              }}
            />
          ))
        : null}
    </YStack>
  );
}
