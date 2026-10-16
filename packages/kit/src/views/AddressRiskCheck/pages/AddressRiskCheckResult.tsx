import { useCallback, useMemo } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';
import { StyleSheet } from 'react-native';

import type { ColorTokens } from '@onekeyhq/components';
import {
  Alert,
  Button,
  Dialog,
  Divider,
  IconButton,
  Illustration,
  LottieView,
  Page,
  ScrollView,
  SizableText,
  XStack,
  YStack,
  useNetInfo,
} from '@onekeyhq/components';
import { useClipboard } from '@onekeyhq/components/src/hooks/useClipboard';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { NetworkAvatar } from '@onekeyhq/kit/src/components/NetworkAvatar';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import type {
  EModalAddressRiskCheckRoutes,
  IModalAddressRiskCheckParamList,
} from '@onekeyhq/shared/src/routes/addressRiskCheck';
import { formatDate } from '@onekeyhq/shared/src/utils/dateUtils';
import { openUrlExternal } from '@onekeyhq/shared/src/utils/openUrlUtils';
import uriUtils from '@onekeyhq/shared/src/utils/uriUtils';
import type { IAddressRiskCheckResult } from '@onekeyhq/shared/types/addressRiskCheck';
import { EKytRiskLevel } from '@onekeyhq/shared/types/kyt';

import { AddressRiskMoreAnalysis } from '../components/AddressRiskMoreAnalysis';
import { CardRow, LEVEL_TEXT_COLOR } from '../components/RiskCheckShared';
import { RiskExposureList } from '../components/RiskExposureList';
import { RiskScoreMeter } from '../components/RiskScoreMeter';
import { useAddressRiskCheckRequest } from '../hooks/useCheckAddressRisk';
import { formatAddressRiskCopy } from '../utils/addressRiskCheckCopy';
import {
  formatRiskPercent,
  getAddressRiskCheckPendingMessageIds,
  getAddressRiskSummaryVariant,
  getRiskExposureStats,
} from '../utils/addressRiskCheckResultUtils';

import type { IAddressRiskCheckCopyKey } from '../utils/addressRiskCheckCopy';
import type { IAddressRiskSummaryVariant } from '../utils/addressRiskCheckResultUtils';
import type { RouteProp } from '@react-navigation/core';

// Checking / failed results never reach the content page in practice; keep the
// original level copy as a fallback for any unexpected level.
const FALLBACK_LEVEL_CONTENT: Partial<
  Record<EKytRiskLevel, { title: ETranslations; description: ETranslations }>
> = {
  [EKytRiskLevel.Checking]: {
    title: ETranslations.address_risk_check_level_checking__title,
    description: ETranslations.address_risk_check_level_checking__desc,
  },
  [EKytRiskLevel.Failed]: {
    title: ETranslations.address_risk_check_level_failed__title,
    description: ETranslations.address_risk_check_level_failed__desc,
  },
};

const SUMMARY_CONTENT: Record<
  Exclude<IAddressRiskSummaryVariant, 'unknown'>,
  { title: ETranslations; description: IAddressRiskCheckCopyKey }
> = {
  clean: {
    title: ETranslations.kyt_no_significant_risk_detected__title,
    description: 'address_risk_check_level_clean__desc',
  },
  low: {
    title: ETranslations.kyt_low_risk_detected__title,
    description: 'address_risk_check_level_low__desc',
  },
  moderate: {
    title: ETranslations.kyt_moderate_risk_detected__title,
    description: 'address_risk_check_level_moderate__desc',
  },
  high: {
    title: ETranslations.kyt_high_risk_detected__title,
    description: 'address_risk_check_level_high__desc',
  },
  severe: {
    title: ETranslations.kyt_severe_risk_detected__title,
    description: 'address_risk_check_level_severe__desc',
  },
};

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  misttrack: 'MistTrack',
};

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <YStack flex={1} gap="$0.5" minWidth={0}>
      <SizableText size="$bodySm" color="$textSubdued" numberOfLines={1}>
        {label}
      </SizableText>
      <SizableText size="$bodyMdMedium" numberOfLines={1}>
        {value}
      </SizableText>
    </YStack>
  );
}

function AddressRiskCheckResultContent({
  result,
  showMoreAnalysis,
  onContinue,
  isHistoryResult,
}: {
  result: IAddressRiskCheckResult;
  showMoreAnalysis: boolean;
  onContinue?: () => void | Promise<void>;
  isHistoryResult?: boolean;
}) {
  const intl = useIntl();
  const { copyText } = useClipboard();
  const isSendFlow = Boolean(onContinue) && !showMoreAnalysis;
  const canContinueToSend =
    isSendFlow &&
    [EKytRiskLevel.None, EKytRiskLevel.Low, EKytRiskLevel.Moderate].includes(
      result.level,
    );

  const { result: network } = usePromiseResult(
    () =>
      backgroundApiProxy.serviceNetwork.getNetworkSafe({
        networkId: result.networkId,
      }),
    [result.networkId],
  );

  const checkedAtText = formatDate(new Date(result.checkedAt * 1000));
  const variant = getAddressRiskSummaryVariant({
    level: result.level,
    factorCount: result.reasons.length,
  });
  const summaryContent =
    variant === 'unknown' ? undefined : SUMMARY_CONTENT[variant];
  const fallbackContent = FALLBACK_LEVEL_CONTENT[result.level];
  const titleText = summaryContent
    ? intl.formatMessage({ id: summaryContent.title })
    : intl.formatMessage({
        id:
          fallbackContent?.title ??
          ETranslations.address_risk_check_level_failed__title,
      });
  const descriptionText = summaryContent
    ? formatAddressRiskCopy(summaryContent.description)
    : intl.formatMessage({
        id:
          fallbackContent?.description ??
          ETranslations.address_risk_check_level_failed__desc,
      });
  const titleColor: ColorTokens =
    variant === 'clean'
      ? '$textSuccess'
      : (LEVEL_TEXT_COLOR[result.level] ?? '$text');
  const stats = useMemo(
    () => getRiskExposureStats(result.reasons),
    [result.reasons],
  );
  const hasScore =
    variant !== 'unknown' &&
    result.score !== undefined &&
    Number.isFinite(result.score);
  const providerName: string | undefined =
    PROVIDER_DISPLAY_NAMES[String(result.provider).toLowerCase()];

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
    // The report page is unstable in the in-app WebView, so it opens in the
    // system browser.
    openUrlExternal(result.reportUrl, { useSystemBrowser: true });
  }, [canViewReport, result.reportUrl]);

  const handleCopyAddress = useCallback(() => {
    copyText(result.address);
  }, [copyText, result.address]);

  const handleClose = useCallback(
    (extra?: { flag?: string }) => {
      if (extra?.flag === 'continueSend') {
        void onContinue?.();
      }
    },
    [onContinue],
  );

  const handleContinueToSend = useCallback(
    (
      _close: (extra?: { flag?: string }) => void,
      closePageStack: (extra?: { flag?: string }) => void,
    ) => {
      closePageStack({ flag: 'continueSend' });
    },
    [],
  );

  const handleBackToEdit = useCallback(
    (
      _close: (extra?: { flag?: string }) => void,
      closePageStack: (extra?: { flag?: string }) => void,
    ) => {
      closePageStack();
    },
    [],
  );

  const handleContinueAnyway = useCallback(
    (
      _close: (extra?: { flag?: string }) => void,
      closePageStack: (extra?: { flag?: string }) => void,
    ) => {
      Dialog.show({
        title: formatAddressRiskCopy(
          'address_risk_check_continue_high_risk__title',
        ),
        description: formatAddressRiskCopy(
          'address_risk_check_exchange_flag__desc',
        ),
        tone: 'warning',
        icon: 'ErrorOutline',
        onConfirmText: intl.formatMessage({
          id: ETranslations.global_continue,
        }),
        onConfirm: () => {
          closePageStack({ flag: 'continueSend' });
        },
      });
    },
    [intl],
  );

  let footer = null;
  if (canContinueToSend) {
    footer = (
      <Page.FooterActions
        onConfirm={handleContinueToSend}
        onConfirmText={intl.formatMessage({
          id: ETranslations.continue_to_send__action,
        })}
        confirmButtonProps={{
          testID: 'address-risk-check-send-action',
        }}
      />
    );
  } else if (isSendFlow && result.level === EKytRiskLevel.High) {
    footer = (
      <Page.FooterActions
        stacked
        onConfirm={handleBackToEdit}
        onConfirmText={intl.formatMessage({ id: ETranslations.global_back })}
        confirmButtonProps={{
          testID: 'address-risk-check-back-action',
        }}
        onCancel={handleContinueAnyway}
        onCancelText={intl.formatMessage({
          id: ETranslations.global_continue_anyway,
        })}
        cancelButtonProps={{
          testID: 'address-risk-check-continue-anyway-action',
        }}
      />
    );
  } else if (isSendFlow && result.level === EKytRiskLevel.Severe) {
    footer = (
      <Page.FooterActions
        onConfirm={handleBackToEdit}
        onConfirmText={intl.formatMessage({ id: ETranslations.global_back })}
        confirmButtonProps={{
          testID: 'address-risk-check-back-action',
        }}
      />
    );
  }

  return (
    <Page onClose={handleClose}>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.address_risk_check__title,
        })}
      />
      <Page.Body>
        <ScrollView>
          <YStack gap="$5" px="$5" pt="$5" pb="$8">
            <YStack gap="$4">
              <YStack gap="$1">
                <SizableText
                  size="$headingXl"
                  color={titleColor}
                  numberOfLines={2}
                >
                  {titleText}
                </SizableText>
                <SizableText size="$bodyMd" color="$textSubdued">
                  {descriptionText}
                </SizableText>
                {isHistoryResult ? (
                  <SizableText size="$bodyMd" color="$textCaution" pt="$1.5">
                    {intl.formatMessage({
                      id: ETranslations.address_risk_check_history_result__desc,
                    })}
                  </SizableText>
                ) : null}
              </YStack>

              {result.level === EKytRiskLevel.High ? (
                <Alert
                  type="critical"
                  icon="ErrorOutline"
                  description={formatAddressRiskCopy(
                    'address_risk_check_exchange_flag__desc',
                  )}
                />
              ) : null}
              {result.level === EKytRiskLevel.Severe ? (
                <Alert
                  type="critical"
                  icon="ErrorOutline"
                  title={formatAddressRiskCopy(
                    'address_risk_check_severe_advice__title',
                  )}
                  description={formatAddressRiskCopy(
                    'address_risk_check_exchange_flag__desc',
                  )}
                />
              ) : null}

              {hasScore || stats.total > 0 ? (
                <YStack
                  p="$4"
                  gap="$4"
                  bg="$bgSubdued"
                  borderRadius="$3"
                  borderCurve="continuous"
                >
                  {hasScore && result.score !== undefined ? (
                    <RiskScoreMeter score={result.score} level={result.level} />
                  ) : null}
                  {hasScore && stats.total > 0 ? <Divider /> : null}
                  {stats.total > 0 ? (
                    <XStack gap="$3">
                      <StatItem
                        label={formatAddressRiskCopy(
                          'address_risk_check_stats_exposures__title',
                        )}
                        value={String(stats.total)}
                      />
                      <StatItem
                        label={formatAddressRiskCopy(
                          'address_risk_check_stats_direct__title',
                        )}
                        value={String(stats.direct)}
                      />
                      <StatItem
                        label={formatAddressRiskCopy(
                          'address_risk_check_stats_largest_share__title',
                        )}
                        value={formatRiskPercent(stats.largestPercent)}
                      />
                    </XStack>
                  ) : null}
                </YStack>
              ) : null}
            </YStack>

            {result.reasons.length > 0 ? (
              <RiskExposureList factors={result.reasons} />
            ) : null}

            <YStack
              borderWidth={StyleSheet.hairlineWidth}
              borderColor="$borderSubdued"
              borderRadius="$3"
              borderCurve="continuous"
              overflow="hidden"
            >
              {network?.name ? (
                <>
                  <CardRow
                    label={intl.formatMessage({
                      id: ETranslations.global_network,
                    })}
                  >
                    <XStack
                      ai="center"
                      jc="flex-end"
                      gap="$1.5"
                      maxWidth="70%"
                      flexShrink={1}
                    >
                      <NetworkAvatar networkId={result.networkId} size="$5" />
                      <SizableText
                        size="$bodyMdMedium"
                        textAlign="right"
                        numberOfLines={1}
                        flexShrink={1}
                      >
                        {network.name}
                      </SizableText>
                    </XStack>
                  </CardRow>
                  <Divider />
                </>
              ) : null}

              <CardRow
                label={intl.formatMessage({
                  id: ETranslations.global_address,
                })}
              >
                <XStack
                  ai="center"
                  jc="flex-end"
                  gap="$1"
                  maxWidth="70%"
                  flexShrink={1}
                >
                  <SizableText
                    size="$bodyMdMedium"
                    numberOfLines={2}
                    textAlign="right"
                    flexShrink={1}
                    style={
                      platformEnv.isNative
                        ? undefined
                        : { wordBreak: 'break-all' }
                    }
                  >
                    {result.address}
                  </SizableText>
                  <IconButton
                    testID="address-risk-check-copy-address"
                    title={intl.formatMessage({
                      id: ETranslations.global_copy_address,
                    })}
                    variant="tertiary"
                    size="small"
                    iconSize="$4"
                    icon="Copy3Outline"
                    onPress={handleCopyAddress}
                  />
                </XStack>
              </CardRow>

              <Divider />
              <CardRow
                label={intl.formatMessage({
                  id: ETranslations.kyt_last_checked__title,
                })}
              >
                <SizableText
                  size="$bodyMdMedium"
                  textAlign="right"
                  numberOfLines={1}
                  flexShrink={1}
                >
                  {checkedAtText}
                </SizableText>
              </CardRow>
            </YStack>

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

            {showMoreAnalysis ? (
              <AddressRiskMoreAnalysis
                networkId={result.networkId}
                address={result.address}
              />
            ) : null}

            <SizableText size="$bodySm" color="$textSubdued">
              {providerName
                ? formatAddressRiskCopy(
                    'address_risk_check_source_disclaimer__desc',
                    { provider: providerName },
                  )
                : formatAddressRiskCopy('address_risk_check_disclaimer__desc')}
            </SizableText>
          </YStack>
        </ScrollView>
      </Page.Body>
      {footer ? <Page.Footer>{footer}</Page.Footer> : null}
    </Page>
  );
}

function AddressRiskCheckPending({ isFailed }: { isFailed: boolean }) {
  const intl = useIntl();
  const { isInternetReachable } = useNetInfo();
  const messageIds = getAddressRiskCheckPendingMessageIds({
    isFailed,
    isInternetReachable,
  });

  return (
    <Page>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.address_risk_check__title,
        })}
      />
      <Page.Body>
        <YStack
          minHeight={320}
          flex={1}
          alignItems="center"
          justifyContent="center"
          gap="$5"
          px="$5"
          py="$8"
        >
          {isFailed ? (
            <Illustration size={110} name="XMark" />
          ) : (
            <LottieView
              source={require('@onekeyhq/kit/assets/animations/swap_order_pending.json')}
              width={110}
              height={110}
              autoPlay
              loop
            />
          )}
          <YStack gap="$2" alignItems="center" maxWidth={360}>
            <SizableText size="$headingLg" textAlign="center">
              {intl.formatMessage({
                id: messageIds.title,
              })}
            </SizableText>
            <SizableText size="$bodyLg" textAlign="center" color="$textSubdued">
              {intl.formatMessage({
                id: messageIds.description,
              })}
            </SizableText>
          </YStack>
        </YStack>
      </Page.Body>
    </Page>
  );
}

function AddressRiskCheckResult() {
  const route =
    useRoute<
      RouteProp<
        IModalAddressRiskCheckParamList,
        EModalAddressRiskCheckRoutes.AddressRiskCheckResult
      >
    >();
  const { checkRequest, showMoreAnalysis, onContinue } = route.params;
  const { result, isHistoryResult, isFailed } =
    useAddressRiskCheckRequest(checkRequest);

  if (!result) {
    return <AddressRiskCheckPending isFailed={isFailed} />;
  }

  return (
    <AddressRiskCheckResultContent
      result={result}
      showMoreAnalysis={showMoreAnalysis}
      onContinue={onContinue}
      isHistoryResult={isHistoryResult}
    />
  );
}

export default AddressRiskCheckResult;
