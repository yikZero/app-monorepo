import { useCallback, useMemo } from 'react';

import { StyleSheet } from 'react-native';
import { useIntl } from 'react-intl';

import {
  Badge,
  Button,
  Empty,
  Heading,
  Icon,
  Page,
  Progress,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { useNetworkDoctorStateAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { ENetworkConnectivityLevel } from '@onekeyhq/shared/src/modules/NetworkDoctor/types';

import useAppNavigation from '../../../hooks/useAppNavigation';

// Hook to map connectivity level to i18n translations
const useConnectivityLevelMap = () => {
  const intl = useIntl();
  return useMemo<Record<ENetworkConnectivityLevel, string>>(
    () => ({
      [ENetworkConnectivityLevel.COMPLETELY_DOWN]: intl.formatMessage({
        id: ETranslations.global_network_doctor_conclusion_completely_down,
      }),
      [ENetworkConnectivityLevel.INTERNATIONAL_RESTRICTED]: intl.formatMessage({
        id: ETranslations.global_network_doctor_conclusion_access_limited,
      }),
      [ENetworkConnectivityLevel.ONEKEY_BLOCKED]: intl.formatMessage({
        id: ETranslations.global_network_doctor_issues_found,
      }),
      [ENetworkConnectivityLevel.ONEKEY_SERVICE_ERROR]: intl.formatMessage({
        id: ETranslations.global_network_doctor_conclusion_unknown,
      }),
      [ENetworkConnectivityLevel.HEALTHY]: intl.formatMessage({
        id: ETranslations.global_network_doctor_conclusion_healthy,
      }),
    }),
    [intl],
  );
};

function NetworkDoctorResult() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const [doctorState] = useNetworkDoctorStateAtom();
  const connectivityLevelMap = useConnectivityLevelMap();

  const { status, progress, result, error } = doctorState;

  const handleContactSupport = useCallback(() => {
    // TODO: Navigate to support page or open support dialog
    console.log('Contact support clicked');
  }, []);

  const handleClose = useCallback(() => {
    navigation.pop();
  }, [navigation]);

  // Render progress view
  const renderProgress = useMemo(() => {
    if (!progress) {
      return (
        <YStack gap="$4" alignItems="center" justifyContent="center" flex={1}>
          <Icon name="LoaderSolid" size="$12" color="$iconActive" />
          <SizableText size="$bodyLg" color="$textSubdued">
            {intl.formatMessage({
              id: ETranslations.global_network_doctor_initializing,
            })}
          </SizableText>
        </YStack>
      );
    }

    return (
      <YStack gap="$4" p="$5">
        <XStack justifyContent="space-between" alignItems="center">
          <Heading size="$headingLg">
            {intl.formatMessage({
              id: ETranslations.global_network_doctor_running_title,
            })}
          </Heading>
          <Badge badgeType="default" badgeSize="sm">
            <Badge.Text>{progress.percentage}%</Badge.Text>
          </Badge>
        </XStack>

        <YStack gap="$2">
          <XStack justifyContent="space-between">
            <SizableText size="$bodySm" fontWeight="600">
              {progress.phase.replace(/_/g, ' ')}
            </SizableText>
            <SizableText size="$bodySm" color="$textSubdued">
              {progress.phaseIndex} / {progress.totalPhases}
            </SizableText>
          </XStack>

          <YStack position="relative">
            <Progress value={progress.percentage} w="100%" />
            <XStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              justifyContent="center"
              alignItems="center"
              pointerEvents="none"
            >
              <SizableText size="$bodyXs" fontWeight="700" color="$text">
                {progress.percentage}%
              </SizableText>
            </XStack>
          </YStack>

          <SizableText size="$bodyMd" color="$textSubdued" mt="$2">
            {progress.message}
          </SizableText>
        </YStack>
      </YStack>
    );
  }, [progress, intl]);

  // Render completed view
  const renderCompleted = useMemo(() => {
    if (!result) return null;

    const { summary } = result;
    const { conclusion } = summary;
    const isHealthy = summary.allCriticalChecksPassed;

    return (
      <YStack p="$5" gap="$5">
        {/* Empty component for icon, title, description */}
        <Empty
          p="$0"
          icon={isHealthy ? 'CheckRadioSolid' : 'ErrorSolid'}
          iconProps={{
            color: isHealthy ? '$iconSuccess' : '$iconCritical',
          }}
          title={intl.formatMessage({
            id: isHealthy
              ? ETranslations.global_network_doctor_all_checks_passed
              : ETranslations.global_network_doctor_issues_found,
          })}
          description={conclusion.summary}
        />

        {/* Diagnosis Details */}
        {!isHealthy && conclusion.suggestedActions.length > 0 ? (
          <YStack gap="$2" mt="$6">
            <Heading size="$bodyMdMedium" color="$textSubdued" pl="$4">
              {intl.formatMessage({
                id: ETranslations.global_network_doctor_suggested_actions_title,
              })}
            </Heading>
            <YStack
              p="$4"
              bg="$bgSubdued"
              borderWidth={StyleSheet.hairlineWidth}
              borderColor="$neutral3"
              borderRadius="$3"
              gap="$2"
            >
              <SizableText size="$bodyMdMedium" color="$text">
                {connectivityLevelMap[conclusion.connectivityLevel]}
              </SizableText>
              <YStack gap="$1" mt="$1">
                {conclusion.suggestedActions.map((action, idx) => (
                  <SizableText key={idx} size="$bodyMd" color="$textSubdued">
                    {idx + 1}. {action}
                  </SizableText>
                ))}
              </YStack>
            </YStack>
          </YStack>
        ) : null}

        {/* Intermediate Issues (Debug Info) */}
        {conclusion.intermediateIssues &&
        conclusion.intermediateIssues.length > 0 ? (
          <YStack gap="$2">
            <Heading size="$headingSm">
              {intl.formatMessage({
                id: ETranslations.global_network_doctor_debug_info_title,
              })}
            </Heading>
            {conclusion.intermediateIssues.map((issue, idx) => (
              <SizableText key={idx} size="$bodyXs" color="$textDisabled">
                • {issue}
              </SizableText>
            ))}
          </YStack>
        ) : null}
      </YStack>
    );
  }, [result, intl]);

  // Render error view
  const renderError = useMemo(() => {
    if (!error) return null;

    return (
      <Empty
        icon="ErrorSolid"
        iconProps={{ color: '$iconCritical' }}
        title={intl.formatMessage({
          id: ETranslations.global_network_doctor_error_title,
        })}
        description={`${intl.formatMessage({
          id: ETranslations.global_an_error_occurred_desc,
        })}\n\n${String(error)}`}
        descriptionProps={{ size: '$bodyMd' }}
      />
    );
  }, [error, intl]);

  return (
    <Page>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.global_network_doctor_title,
        })}
      />
      <Page.Body>
        {status === 'running' ? renderProgress : null}
        {status === 'completed' ? renderCompleted : null}
        {status === 'failed' ? renderError : null}
        {status === 'idle' ? (
          <YStack gap="$4" alignItems="center" justifyContent="center" flex={1}>
            <SizableText size="$bodyLg" color="$textSubdued">
              {intl.formatMessage({
                id: ETranslations.global_network_doctor_not_started,
              })}
            </SizableText>
            <Button variant="secondary" onPress={handleClose}>
              {intl.formatMessage({
                id: ETranslations.global_close,
              })}
            </Button>
          </YStack>
        ) : null}
      </Page.Body>
      {status === 'completed' || status === 'failed' ? (
        <Page.Footer>
          <Page.FooterActions
            onCancelText={intl.formatMessage({
              id: ETranslations.global_close,
            })}
            cancelButtonProps={{
              onPress: handleClose,
              variant: 'secondary',
            }}
            onConfirmText={
              status === 'completed' &&
              result &&
              !result.summary.allCriticalChecksPassed
                ? intl.formatMessage({
                    id: ETranslations.global_network_doctor_btn_contact_support,
                  })
                : undefined
            }
            confirmButtonProps={
              status === 'completed' &&
              result &&
              !result.summary.allCriticalChecksPassed
                ? {
                    onPress: handleContactSupport,
                    icon: 'HelpSupportOutline',
                  }
                : undefined
            }
          />
        </Page.Footer>
      ) : null}
    </Page>
  );
}

export default NetworkDoctorResult;
