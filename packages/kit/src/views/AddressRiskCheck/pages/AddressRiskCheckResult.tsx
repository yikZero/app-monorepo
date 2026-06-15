import { useCallback, useMemo, useState } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';
import { StyleSheet } from 'react-native';

import {
  Button,
  Divider,
  IconButton,
  Page,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { useClipboard } from '@onekeyhq/components/src/hooks/useClipboard';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { NetworkAvatar } from '@onekeyhq/kit/src/components/NetworkAvatar';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type {
  EModalAddressRiskCheckRoutes,
  IModalAddressRiskCheckParamList,
} from '@onekeyhq/shared/src/routes/addressRiskCheck';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { formatDate } from '@onekeyhq/shared/src/utils/dateUtils';
import { openUrlExternal } from '@onekeyhq/shared/src/utils/openUrlUtils';
import uriUtils from '@onekeyhq/shared/src/utils/uriUtils';

import { AddressRiskMoreAnalysis } from '../components/AddressRiskMoreAnalysis';
import {
  CardRow,
  LEVEL_TEXT_COLOR,
  LEVEL_TITLE,
  RiskFactorCard,
} from '../components/RiskCheckShared';
import { ARC_TEXTS } from '../texts';

import type { RouteProp } from '@react-navigation/core';

function AddressRiskCheckResult() {
  const intl = useIntl();
  const { copyText } = useClipboard();
  const route =
    useRoute<
      RouteProp<
        IModalAddressRiskCheckParamList,
        EModalAddressRiskCheckRoutes.AddressRiskCheckResult
      >
    >();
  const { result } = route.params;

  const [showAllFactors, setShowAllFactors] = useState(false);

  const { result: network } = usePromiseResult(
    () =>
      backgroundApiProxy.serviceNetwork.getNetworkSafe({
        networkId: result.networkId,
      }),
    [result.networkId],
  );

  const visibleFactors = useMemo(
    () => (showAllFactors ? result.reasons : result.reasons.slice(0, 1)),
    [result.reasons, showAllFactors],
  );
  const hasMoreFactors = result.reasons.length > 1;

  const shortAddress = accountUtils.shortenAddress({ address: result.address });
  const checkedAtText = formatDate(new Date(result.checkedAt * 1000));

  // Only trust HTTPS report links from the backend — defense in depth against a
  // tampered/compromised response opening a deep link or phishing page.
  const canViewReport = useMemo(
    () =>
      Boolean(result.reportUrl) &&
      uriUtils.parseUrl(result.reportUrl ?? '')?.urlSchema === 'https',
    [result.reportUrl],
  );

  const handleViewReport = useCallback(() => {
    if (!canViewReport || !result.reportUrl) {
      return;
    }
    openUrlExternal(result.reportUrl);
  }, [canViewReport, result.reportUrl]);

  const handleCopyAddress = useCallback(() => {
    copyText(result.address);
  }, [copyText, result.address]);

  return (
    <Page>
      <Page.Header title={ARC_TEXTS.title} />
      <Page.Body>
        <ScrollView>
          <YStack px="$5" py="$3" gap="$4">
            <YStack gap="$1.5">
              <SizableText
                size="$headingXl"
                color={LEVEL_TEXT_COLOR[result.level] ?? '$text'}
              >
                {ARC_TEXTS.levelHeading[result.level] ?? ''}
              </SizableText>
              <SizableText size="$bodyLg" color="$textSubdued">
                {ARC_TEXTS.levelDescription[result.level] ?? ''}
              </SizableText>
            </YStack>

            <YStack
              borderWidth={StyleSheet.hairlineWidth}
              borderColor="$borderSubdued"
              borderRadius="$3"
              overflow="hidden"
            >
              <CardRow
                label={intl.formatMessage({
                  id: ETranslations.kyt_risk_level__title,
                })}
              >
                <SizableText
                  size="$bodyMdMedium"
                  color={LEVEL_TEXT_COLOR[result.level] ?? '$text'}
                >
                  {intl.formatMessage({ id: LEVEL_TITLE[result.level] })}
                </SizableText>
              </CardRow>
              <Divider />
              <CardRow
                label={intl.formatMessage({ id: ETranslations.global_network })}
              >
                <XStack ai="center" gap="$1.5">
                  <NetworkAvatar networkId={result.networkId} size="$4" />
                  <SizableText size="$bodyMdMedium">
                    {network?.name ?? ''}
                  </SizableText>
                </XStack>
              </CardRow>
              <Divider />
              <CardRow
                label={intl.formatMessage({ id: ETranslations.global_address })}
              >
                <XStack ai="center" gap="$1">
                  <SizableText size="$bodyMdMedium">{shortAddress}</SizableText>
                  <IconButton
                    testID="address-risk-check-copy-address"
                    variant="tertiary"
                    size="small"
                    iconSize="$4"
                    icon="Copy3Outline"
                    onPress={handleCopyAddress}
                  />
                </XStack>
              </CardRow>
              <Divider />
              <CardRow label={ARC_TEXTS.lastChecked}>
                <SizableText size="$bodyMdMedium">{checkedAtText}</SizableText>
              </CardRow>
            </YStack>

            {result.reasons.length > 0 ? (
              <YStack gap="$2">
                <XStack ai="center" jc="space-between">
                  <SizableText size="$headingSm" color="$textSubdued">
                    {intl.formatMessage({
                      id: ETranslations.kyt_risk_factors__title,
                    })}
                  </SizableText>
                  <SizableText size="$bodyMdMedium" color="$textSubdued">
                    {intl.formatMessage(
                      { id: ETranslations.kyt_risk_factors_found__msg },
                      { count: result.reasons.length },
                    )}
                  </SizableText>
                </XStack>
                <YStack gap="$1">
                  {visibleFactors.map((factor, index) => (
                    <RiskFactorCard key={index} factor={factor} />
                  ))}
                </YStack>
                {hasMoreFactors ? (
                  <SizableText
                    size="$bodyMdMedium"
                    color="$textSuccess"
                    cursor="pointer"
                    onPress={() => setShowAllFactors((v) => !v)}
                  >
                    {intl.formatMessage({
                      id: showAllFactors
                        ? ETranslations.global_show_less
                        : ETranslations.global_show_more,
                    })}
                  </SizableText>
                ) : null}
              </YStack>
            ) : null}

            {canViewReport ? (
              <Button
                testID="address-risk-check-view-report"
                variant="secondary"
                size="large"
                iconAfter="ArrowTopRightOutline"
                onPress={handleViewReport}
              >
                {intl.formatMessage({
                  id: ETranslations.kyt_view_report__action,
                })}
              </Button>
            ) : null}

            <AddressRiskMoreAnalysis
              networkId={result.networkId}
              address={result.address}
            />
          </YStack>
        </ScrollView>
      </Page.Body>
    </Page>
  );
}

export default AddressRiskCheckResult;
