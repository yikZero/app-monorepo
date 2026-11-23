import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIntl } from 'react-intl';

import { Icon, SizableText, Stack, YStack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';
import type { IAddressInfo } from '@onekeyhq/shared/types/address';
import type { IContractApproval } from '@onekeyhq/shared/types/approval';
import type { IToken } from '@onekeyhq/shared/types/token';

import backgroundApiProxy from '../../background/instance/backgroundApiProxy';
import useAppNavigation from '../../hooks/useAppNavigation';
import { usePromiseResult } from '../../hooks/usePromiseResult';
import {
  useApprovalListAtom,
  useIsBulkRevokeModeAtom,
} from '../../states/jotai/contexts/approvalList';
import { ListItem } from '../ListItem';

import { useApprovalListViewContext } from './ApprovalListViewContext';
import { getEip7702DemoDelegations } from './eip7702DemoData';

function HeaderItem({ label }: { label: string }) {
  return (
    <SizableText size="$bodyMdMedium" color="$textSubdued" userSelect="none">
      {label}
    </SizableText>
  );
}

function ApprovalListHeader({
  hideRiskOverview,
  tokenMap,
  contractMap,
}: {
  hideRiskOverview?: boolean;
  tokenMap: Record<
    string,
    {
      price: string;
      price24h: string;
      info: IToken;
    }
  >;
  contractMap: Record<string, IAddressInfo>;
}) {
  const intl = useIntl();

  const navigation = useAppNavigation();

  const {
    tableLayout,
    accountId,
    networkId,
    indexedAccountId,
    selectDisabled,
    isAllNetworks,
  } = useApprovalListViewContext();
  const [isBulkRevokeMode] = useIsBulkRevokeModeAtom();

  // isReady: async result has returned
  // isVisible: layout has been computed, safe to show
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showApprovalsAlert, setShowApprovalsAlert] = useState(false);
  const hasInitialized = useRef(false);

  const [{ approvals }] = useApprovalListAtom();

  const { riskApprovals, warningApprovals } = useMemo(() => {
    return approvals.reduce<{
      riskApprovals: IContractApproval[];
      warningApprovals: IContractApproval[];
    }>(
      (acc, approval) => {
        if (approval.isRiskContract) {
          acc.riskApprovals.push(approval);
        } else if (approval.isInactiveApproval) {
          acc.warningApprovals.push(approval);
        }
        return acc;
      },
      { riskApprovals: [], warningApprovals: [] },
    );
  }, [approvals]);

  // Demo (OK-67574): risky EIP-7702 delegations count toward the alert.
  const riskyDelegationsCount = useMemo(
    () =>
      getEip7702DemoDelegations({
        networkId,
        isAllNetworks: !!isAllNetworks,
      }).filter((d) => !!d.riskReason).length,
    [networkId, isAllNetworks],
  );

  const { result } = usePromiseResult(async () => {
    const [_shouldShowInactiveApprovalsAlert, _shouldShowRiskApprovalsAlert] =
      await Promise.all([
        backgroundApiProxy.serviceApproval.shouldShowInactiveApprovalsAlert({
          accountId,
          networkId,
        }),
        backgroundApiProxy.serviceApproval.shouldShowRiskApprovalsAlert({
          accountId,
          networkId,
        }),
      ]);
    return {
      shouldShowInactiveApprovalsAlert:
        _shouldShowInactiveApprovalsAlert && warningApprovals.length > 0,
      shouldShowRiskApprovalsAlert:
        _shouldShowRiskApprovalsAlert &&
        riskApprovals.length + riskyDelegationsCount > 0,
    };
  }, [
    accountId,
    networkId,
    riskApprovals.length,
    riskyDelegationsCount,
    warningApprovals.length,
  ]);

  const { shouldShowInactiveApprovalsAlert, shouldShowRiskApprovalsAlert } =
    result ?? {};

  const renderTableHeader = useCallback(() => {
    if (!tableLayout || approvals?.length <= 0 || !isReady) {
      return null;
    }

    return (
      <ListItem
        testID="Wallet-Approval-List-Header"
        opacity={isVisible ? 1 : 0}
        childrenBefore={
          platformEnv.isNative && isBulkRevokeMode && !selectDisabled ? (
            <Stack width="$8" />
          ) : undefined
        }
      >
        <Stack flexGrow={1} flexBasis={0} alignItems="flex-start">
          <HeaderItem
            label={intl.formatMessage({ id: ETranslations.global_contract })}
          />
        </Stack>
        <Stack flexGrow={1} flexBasis={0}>
          <HeaderItem
            label={intl.formatMessage({
              id: ETranslations.global_contract_address,
            })}
          />
        </Stack>
        <Stack flexGrow={1} flexBasis={0}>
          <HeaderItem
            label={intl.formatMessage({
              id: ETranslations.wallet_approval_approved_token,
            })}
          />
        </Stack>
        <Stack flexGrow={1} flexBasis={0} alignItems="flex-end" maxWidth="$36">
          <HeaderItem
            label={intl.formatMessage({
              id: ETranslations.global_approval_time,
            })}
          />
        </Stack>
      </ListItem>
    );
  }, [
    intl,
    tableLayout,
    approvals?.length,
    isReady,
    isVisible,
    isBulkRevokeMode,
    selectDisabled,
  ]);

  const handleViewRiskApprovals = useCallback(
    ({ approvals: _approvals }: { approvals: IContractApproval[] }) => {
      navigation.pushModal(EModalRoutes.ApprovalManagementModal, {
        screen: EModalApprovalManagementRoutes.RevokeSuggestion,
        params: {
          approvals: _approvals,
          contractMap,
          tokenMap,
          accountId,
          networkId,
          indexedAccountId,
        },
      });
    },
    [navigation, contractMap, tokenMap, accountId, networkId, indexedAccountId],
  );

  const markApprovalsAlertSeen = useCallback(async () => {
    const tasks = [];

    if (riskApprovals.length > 0) {
      tasks.push(
        backgroundApiProxy.serviceApproval.updateRiskApprovalsAlertConfig({
          accountId,
          networkId,
        }),
      );
    }

    if (warningApprovals.length > 0) {
      tasks.push(
        backgroundApiProxy.serviceApproval.updateInactiveApprovalsAlertConfig({
          accountId,
          networkId,
        }),
      );
    }

    await Promise.all(tasks);
  }, [accountId, networkId, riskApprovals.length, warningApprovals.length]);

  // Demo (OK-67574): a quiet list row instead of the colored banner. Only the
  // icon turns red when something is risky; numbers stay plain text.
  const renderRiskOverview = useCallback(() => {
    if (hideRiskOverview || !isReady) {
      return null;
    }

    const riskyNumber = riskApprovals.length + riskyDelegationsCount;
    const inactiveNumber = warningApprovals.length;

    if (!showApprovalsAlert || (riskyNumber === 0 && inactiveNumber === 0)) {
      return null;
    }

    const isRisky = riskyNumber > 0;
    const subtitle = [
      riskyNumber > 0 ? `${riskyNumber} risky` : '',
      inactiveNumber > 0 ? `${inactiveNumber} unused for 90+ days` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <YStack pb="$2" opacity={isVisible ? 1 : 0}>
        <ListItem
          testID="approval-list-revoke-suggestion-row"
          drillIn
          title={intl.formatMessage({
            id: ETranslations.wallet_revoke_suggestion,
          })}
          subtitle={subtitle}
          renderAvatar={
            <Stack
              w="$10"
              h="$10"
              borderRadius="$full"
              bg={isRisky ? '$bgCritical' : '$bgStrong'}
              alignItems="center"
              justifyContent="center"
            >
              <Icon
                name="ShieldExclamationOutline"
                size="$5"
                color={isRisky ? '$iconCritical' : '$icon'}
              />
            </Stack>
          }
          onPress={() => {
            let approvalsToView: IContractApproval[] = [];
            if (riskApprovals.length > 0 && inactiveNumber > 0) {
              approvalsToView = [...riskApprovals, ...warningApprovals];
            } else if (riskApprovals.length > 0) {
              approvalsToView = riskApprovals;
            } else {
              approvalsToView = warningApprovals;
            }
            handleViewRiskApprovals({ approvals: approvalsToView });
            // Seen once: it resurfaces after the existing interval.
            void markApprovalsAlertSeen();
          }}
        />
      </YStack>
    );
  }, [
    markApprovalsAlertSeen,
    handleViewRiskApprovals,
    hideRiskOverview,
    intl,
    riskApprovals,
    riskyDelegationsCount,
    showApprovalsAlert,
    warningApprovals,
    isReady,
    isVisible,
  ]);

  // Step 1: When async result returns, set isReady and showApprovalsAlert
  useEffect(() => {
    if (
      shouldShowInactiveApprovalsAlert === undefined &&
      shouldShowRiskApprovalsAlert === undefined
    ) {
      return;
    }

    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const targetShow = !!(
      shouldShowInactiveApprovalsAlert || shouldShowRiskApprovalsAlert
    );

    setShowApprovalsAlert(targetShow);
    setIsReady(true);

    // Use requestAnimationFrame to wait for the next paint,
    // then show content after the layout has settled
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, [shouldShowInactiveApprovalsAlert, shouldShowRiskApprovalsAlert]);

  return (
    <YStack>
      {renderRiskOverview()}
      {renderTableHeader()}
    </YStack>
  );
}

export default memo(ApprovalListHeader);
