import { memo, useCallback, useEffect, useMemo } from 'react';

import { useRoute } from '@react-navigation/core';
import { FormattedMessage, useIntl } from 'react-intl';

import {
  Icon,
  Page,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IModalApprovalManagementParamList } from '@onekeyhq/shared/src/routes/approvalManagement';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';
import approvalUtils from '@onekeyhq/shared/src/utils/approvalUtils';
import type { IContractApproval } from '@onekeyhq/shared/types/approval';
import { EContractApprovalAlertType } from '@onekeyhq/shared/types/approval';

import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';
import ApprovalListView from '../../../components/ApprovalListView';
import useAppNavigation from '../../../hooks/useAppNavigation';
import {
  ProviderJotaiContextApprovalList,
  useApprovalListActions,
  useSelectedTokensAtom,
} from '../../../states/jotai/contexts/approvalList';
import ApprovalActions from '../components/ApprovalActions';
import { useBulkRevoke } from '../hooks/useBulkRevoke';

import type { RouteProp } from '@react-navigation/core';

function RevokeSuggestion() {
  const intl = useIntl();
  const route =
    useRoute<
      RouteProp<
        IModalApprovalManagementParamList,
        EModalApprovalManagementRoutes.RevokeSuggestion
      >
    >();
  const {
    accountId,
    networkId,
    approvals,
    alertType,
    tokenMap,
    contractMap,
    autoShow,
  } = route.params;
  const {
    updateApprovalList,
    updateTokenMap,
    updateContractMap,
    updateApprovalListState,
    updateSelectedTokens,
    updateIsBulkRevokeMode,
  } = useApprovalListActions().current;

  const navigation = useAppNavigation();

  const { navigationToBulkRevokeProcess, isBuildingRevokeTxs } =
    useBulkRevoke();

  const [{ selectedTokens }] = useSelectedTokensAtom();
  const { isSelectAllTokens, selectedCount } = useMemo(() => {
    return approvalUtils.checkIsSelectAllTokens({
      approvals,
      selectedTokens,
    });
  }, [approvals, selectedTokens]);

  useEffect(() => {
    // select all tokens by default
    const selectedTokensTemp = approvalUtils.buildToggleSelectAllTokensMap({
      approvals,
      toggle: true,
    });

    updateSelectedTokens({
      selectedTokens: selectedTokensTemp,
    });
    updateApprovalList({
      data: approvals,
    });
    updateTokenMap({
      data: tokenMap,
    });
    updateContractMap({
      data: contractMap,
    });
    updateApprovalListState({
      isRefreshing: false,
      initialized: true,
    });

    updateIsBulkRevokeMode(true);
  }, [
    approvals,
    alertType,
    contractMap,
    tokenMap,
    updateApprovalList,
    updateTokenMap,
    updateContractMap,
    updateApprovalListState,
    updateSelectedTokens,
    updateIsBulkRevokeMode,
  ]);

  const handleApprovalItemOnPress = useCallback(
    (approval: IContractApproval) => {
      navigation.push(EModalApprovalManagementRoutes.ApprovalDetails, {
        approval,
        isSelectMode: true,

        onSelected: ({
          selectedTokens: _selectedTokens,
        }: {
          selectedTokens: Record<string, boolean>;
        }) => {
          updateSelectedTokens({
            selectedTokens: _selectedTokens,
            merge: true,
          });
        },
        selectedTokens,
        tokenMap,
        contractMap,
      });
    },
    [navigation, updateSelectedTokens, selectedTokens, tokenMap, contractMap],
  );

  const renderRevokeSuggestionOverview = useCallback(() => {
    const isWarning = alertType === EContractApprovalAlertType.Warning;
    const riskyNumber = approvals.filter((i) => i.isRiskContract).length;
    const inactiveNumber = approvals.filter((i) => i.isInactiveApproval).length;
    const isSummary = riskyNumber > 0 && inactiveNumber > 0;

    const isCritical = isSummary || !isWarning;
    let descId =
      ETranslations.wallet_approval_risky_detected_suggestion_description;
    if (isSummary) {
      descId = ETranslations.wallet_approval_summary_suggestion_desc_all;
    } else if (isWarning) {
      descId = ETranslations.wallet_approval_inactive_suggestion_description;
    }

    return (
      <YStack p="$5" gap="$4">
        <XStack>
          <Stack
            borderRadius="$full"
            bg={isCritical ? '$bgCritical' : '$bgCaution'}
            p="$3"
          >
            <Icon
              name="ShieldExclamationOutline"
              size="$8"
              color={isCritical ? '$iconCritical' : '$iconCaution'}
            />
          </Stack>
        </XStack>
        <YStack gap="$1">
          <SizableText size="$heading2xl">
            {isSummary ? (
              <FormattedMessage
                id={ETranslations.wallet_approval_summary_suggestion_title}
                values={{
                  riskyNumber: (
                    <SizableText size="$heading2xl" color="$textCritical">
                      {riskyNumber}
                    </SizableText>
                  ),
                  inactiveNumber: (
                    <SizableText size="$heading2xl" color="$textCaution">
                      {inactiveNumber}
                    </SizableText>
                  ),
                }}
              />
            ) : (
              <FormattedMessage
                id={
                  isWarning
                    ? ETranslations.wallet_approval_inactive_suggestion_title
                    : ETranslations.wallet_approval_risky_suggestion_title
                }
                values={{
                  number: (
                    <SizableText
                      size="$heading2xl"
                      color={isCritical ? '$textCritical' : '$textCaution'}
                    >
                      {isWarning ? inactiveNumber : riskyNumber}
                    </SizableText>
                  ),
                }}
              />
            )}
          </SizableText>
          <SizableText size="$bodyLg" color="$textSubdued">
            {intl.formatMessage({ id: descId })}
          </SizableText>
        </YStack>
      </YStack>
    );
  }, [alertType, approvals, intl]);

  const renderRevokeSuggestionList = useCallback(() => {
    const riskyNumber = approvals.filter((i) => i.isRiskContract).length;
    const inactiveNumber = approvals.filter((i) => i.isInactiveApproval).length;
    const isSummary = riskyNumber > 0 && inactiveNumber > 0;
    return (
      <ApprovalListView
        hideRiskBadge={!isSummary}
        onPress={handleApprovalItemOnPress}
        accountId={accountId}
        networkId={networkId}
      />
    );
  }, [accountId, approvals, handleApprovalItemOnPress, networkId]);

  const handleSelectAll = useCallback(() => {
    const selectedTokensTemp = approvalUtils.buildToggleSelectAllTokensMap({
      approvals,
      toggle: !(isSelectAllTokens === true),
    });

    updateSelectedTokens({
      selectedTokens: selectedTokensTemp,
    });
  }, [approvals, isSelectAllTokens, updateSelectedTokens]);

  const handleOnConfirm = useCallback(() => {
    void navigationToBulkRevokeProcess({
      selectedTokens,
      tokenMap,
      contractMap,
    });
  }, [navigationToBulkRevokeProcess, selectedTokens, tokenMap, contractMap]);
  const handleOnCancel = useCallback(async () => {
    if (autoShow) {
      await backgroundApiProxy.serviceApproval.updateRiskApprovalsRevokeSuggestionConfig(
        {
          networkId,
          accountId,
        },
      );
    }
    navigation.popStack();
  }, [navigation, networkId, accountId, autoShow]);

  const renderBulkRevokeActions = () => {
    return (
      <ApprovalActions
        isSelectAll={isSelectAllTokens}
        setIsSelectAll={handleSelectAll}
        onConfirm={handleOnConfirm}
        onCancel={handleOnCancel}
        onCancelText={intl.formatMessage({
          id: autoShow
            ? ETranslations.global_skip_for_now
            : ETranslations.global_cancel,
        })}
        isBulkRevokeMode
        selectedCount={selectedCount}
        isBuildingRevokeTxs={isBuildingRevokeTxs}
      />
    );
  };

  return (
    <Page scrollEnabled>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.wallet_revoke_suggestion,
        })}
      />
      <Page.Body>
        {renderRevokeSuggestionOverview()}
        {renderRevokeSuggestionList()}
      </Page.Body>
      {renderBulkRevokeActions()}
    </Page>
  );
}

const RevokeSuggestionWithProvider = memo(() => {
  return (
    <ProviderJotaiContextApprovalList>
      <RevokeSuggestion />
    </ProviderJotaiContextApprovalList>
  );
});
RevokeSuggestionWithProvider.displayName = 'RevokeSuggestionWithProvider';

export default RevokeSuggestionWithProvider;
