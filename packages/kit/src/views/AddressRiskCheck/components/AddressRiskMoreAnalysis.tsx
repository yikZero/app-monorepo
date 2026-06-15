import { useCallback, useState } from 'react';

import BigNumber from 'bignumber.js';
import { useIntl } from 'react-intl';

import {
  Badge,
  Button,
  Divider,
  Icon,
  SizableText,
  Stack,
  Toast,
  XStack,
  YStack,
} from '@onekeyhq/components';
import type { IKeyOfIcons } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { formatDate } from '@onekeyhq/shared/src/utils/dateUtils';
import type { IAddressRiskCheckDetails } from '@onekeyhq/shared/types/addressRiskCheck';

import { ARC_TEXTS } from '../texts';

function formatActiveDate(seconds: number) {
  if (!seconds) {
    return '-';
  }
  return formatDate(new Date(seconds * 1000), {
    formatTemplate: 'MMM d, yyyy',
  });
}

function SectionHeader({ title, extra }: { title: string; extra?: string }) {
  return (
    <XStack ai="center" jc="space-between">
      <SizableText size="$headingSm">{title}</SizableText>
      {extra ? (
        <SizableText size="$bodyMd" color="$textSubdued">
          {extra}
        </SizableText>
      ) : null}
    </XStack>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <YStack
      borderWidth={1}
      borderColor="$borderSubdued"
      borderRadius="$3"
      overflow="hidden"
    >
      {children}
    </YStack>
  );
}

function ActivityCell({
  icon,
  label,
  value,
}: {
  icon: IKeyOfIcons;
  label: string;
  value: string;
}) {
  return (
    <XStack flex={1} ai="center" gap="$2" px="$3" py="$2.5" minWidth={0}>
      <Stack
        w={30}
        h={30}
        ai="center"
        jc="center"
        borderRadius="$2"
        bg="$bgSubdued"
      >
        <Icon name={icon} size="$5" color="$iconSubdued" />
      </Stack>
      <YStack flex={1} gap="$0.5" minWidth={0}>
        <SizableText size="$bodySm" color="$textSubdued" numberOfLines={1}>
          {label}
        </SizableText>
        <SizableText size="$bodyMdMedium" numberOfLines={1}>
          {value}
        </SizableText>
      </YStack>
    </XStack>
  );
}

function AddressActivityBlock({
  activity,
}: {
  activity: IAddressRiskCheckDetails['activity'];
}) {
  const total = activity.receivedTxs + activity.sentTxs;
  const receivedPercent = total > 0 ? (activity.receivedTxs / total) * 100 : 0;
  const sentPercent = total > 0 ? 100 - receivedPercent : 0;
  const receivedPercentText = `${new BigNumber(receivedPercent).toFixed(1)}%`;
  const sentPercentText = `${new BigNumber(sentPercent).toFixed(1)}%`;

  return (
    <YStack gap="$3">
      <SectionHeader
        title={ARC_TEXTS.addressActivity}
        extra={ARC_TEXTS.txsLabel(activity.totalTxs)}
      />
      <Card>
        <XStack>
          <ActivityCell
            icon="CalendarOutline"
            label={ARC_TEXTS.firstActive}
            value={formatActiveDate(activity.firstActiveAt)}
          />
          <ActivityCell
            icon="CalendarOutline"
            label={ARC_TEXTS.lastActive}
            value={formatActiveDate(activity.lastActiveAt)}
          />
        </XStack>
        <Divider />
        <XStack>
          <ActivityCell
            icon="SwitchVerOutline"
            label={ARC_TEXTS.receivedSent}
            value={`${activity.receivedTxs} / ${activity.sentTxs}`}
          />
          <ActivityCell
            icon="CoinsOutline"
            label="Balance"
            value={`${activity.balance} ${activity.balanceSymbol}`}
          />
        </XStack>
        <Divider />
        <YStack px="$4" py="$2.5" gap="$1.5">
          <XStack jc="space-between">
            <SizableText size="$bodySm" color="$textSuccess">
              {`${ARC_TEXTS.received} ${receivedPercentText}`}
            </SizableText>
            <SizableText size="$bodySm" color="$textInfo">
              {`${ARC_TEXTS.sent} ${sentPercentText}`}
            </SizableText>
          </XStack>
          <XStack height={6} gap={2}>
            <Stack
              flexGrow={receivedPercent}
              bg="$bgSuccessStrong"
              borderRadius="$full"
            />
            <Stack
              flexGrow={sentPercent}
              bg="$bgInfoStrong"
              borderRadius="$full"
            />
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );
}

function PlatformProfileBlock({
  platformProfile,
}: {
  platformProfile: IAddressRiskCheckDetails['platformProfile'];
}) {
  const { exchanges, dex, mixer, nft } = platformProfile;
  const noOtherSignals =
    dex.count === 0 && mixer.count === 0 && nft.count === 0;

  return (
    <YStack gap="$3">
      <SectionHeader
        title={ARC_TEXTS.platformProfile}
        extra={ARC_TEXTS.exchangesLabel(exchanges.count)}
      />
      <Card>
        <YStack px="$4" py="$3" gap="$3">
          {exchanges.list.length ? (
            <XStack flexWrap="wrap" gap="$2">
              {exchanges.list.map((name) => (
                <Badge key={name} badgeType="default" badgeSize="lg">
                  <Badge.Text>{name}</Badge.Text>
                </Badge>
              ))}
            </XStack>
          ) : null}
          <XStack ai="center" gap="$2">
            <Stack w={6} h={6} borderRadius="$full" bg="$iconSubdued" />
            <SizableText size="$bodyMd" color="$textSubdued">
              {noOtherSignals
                ? ARC_TEXTS.noPlatformSignals
                : `DEX ${dex.count} · Mixer ${mixer.count} · NFT ${nft.count}`}
            </SizableText>
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );
}

function RiskIntelligenceBlock({
  riskIntelligence,
}: {
  riskIntelligence: IAddressRiskCheckDetails['riskIntelligence'];
}) {
  const entries = (
    Object.keys(riskIntelligence) as Array<keyof typeof riskIntelligence>
  )
    .map((key) => ({ key, ...riskIntelligence[key] }))
    .filter((item) => item.count > 0);
  const totalSignals = entries.reduce((sum, item) => sum + item.count, 0);

  if (!entries.length) {
    return null;
  }

  return (
    <YStack gap="$3">
      <SectionHeader
        title={ARC_TEXTS.riskIntelligence}
        extra={ARC_TEXTS.signalsLabel(totalSignals)}
      />
      <Card>
        {entries.map((item, index) => (
          <YStack key={item.key}>
            {index > 0 ? <Divider /> : null}
            <XStack px="$4" py="$3" ai="center" jc="space-between" gap="$2">
              <YStack flex={1} gap="$0.5">
                <SizableText size="$bodyMdMedium">
                  {ARC_TEXTS.riskIntelligenceCategory[item.key] ?? item.key}
                </SizableText>
                {item.list.length ? (
                  <SizableText size="$bodySm" color="$textSubdued">
                    {item.list.join(', ')}
                  </SizableText>
                ) : null}
              </YStack>
              <SizableText size="$bodyMdMedium">
                {ARC_TEXTS.signalsLabel(item.count)}
              </SizableText>
            </XStack>
          </YStack>
        ))}
      </Card>
    </YStack>
  );
}

export function AddressRiskMoreAnalysis({
  networkId,
  address,
}: {
  networkId: string;
  address: string;
}) {
  const intl = useIntl();
  const [isLoading, setIsLoading] = useState(false);
  const [details, setDetails] = useState<
    IAddressRiskCheckDetails | undefined
  >();

  const handleLoad = useCallback(async () => {
    setIsLoading(true);
    try {
      const data =
        await backgroundApiProxy.serviceAddressRiskCheck.getAddressRiskDetails({
          networkId,
          address,
        });
      setDetails(data);
    } catch {
      Toast.error({
        title: intl.formatMessage({
          id: ETranslations.global_an_error_occurred,
        }),
        message: intl.formatMessage({
          id: ETranslations.global_an_error_occurred_desc,
        }),
      });
    } finally {
      setIsLoading(false);
    }
  }, [networkId, address, intl]);

  if (!details) {
    return (
      <Button
        testID="address-risk-check-more-analysis"
        variant="tertiary"
        size="large"
        loading={isLoading}
        onPress={handleLoad}
      >
        {ARC_TEXTS.moreAnalysis}
      </Button>
    );
  }

  return (
    <YStack gap="$5">
      <AddressActivityBlock activity={details.activity} />
      <PlatformProfileBlock platformProfile={details.platformProfile} />
      <RiskIntelligenceBlock riskIntelligence={details.riskIntelligence} />
    </YStack>
  );
}
