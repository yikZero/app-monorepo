import { memo, useCallback, useMemo } from 'react';

import { Icon, SizableText, XStack } from '@onekeyhq/components';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';
import type { IContractApproval } from '@onekeyhq/shared/types/approval';

import backgroundApiProxy from '../../background/instance/backgroundApiProxy';
import useAppNavigation from '../../hooks/useAppNavigation';
import { usePromiseResult } from '../../hooks/usePromiseResult';
import {
  useApprovalListAtom,
  useApprovalListStateAtom,
  useContractMapAtom,
  useTokenMapAtom,
} from '../../states/jotai/contexts/approvalList';

import { getEip7702DemoDelegations } from './eip7702DemoData';

// Demo copy (OK-67574), not yet in onekey-i18n.
const DEMO_COPY = {
  risky: (n: number) => `${n} risky`,
  unused: (n: number) => `${n} unused`,
};

// Demo (OK-67574): the revoke suggestion as a small pill in the filter bar,
// replacing the colored banner above the list. Only the shield turns red when
// something is risky; it resurfaces by the existing alert interval once seen.
function RevokeSuggestionPill({
  accountId,
  networkId,
  indexedAccountId,
  isAllNetworks,
}: {
  accountId: string;
  networkId: string;
  indexedAccountId?: string;
  isAllNetworks: boolean;
}) {
  const navigation = useAppNavigation();
  const [{ approvals }] = useApprovalListAtom();
  const [{ initialized }] = useApprovalListStateAtom();
  const [{ tokenMap }] = useTokenMapAtom();
  const [{ contractMap }] = useContractMapAtom();

  const { riskApprovals, warningApprovals } = useMemo(() => {
    const risk: IContractApproval[] = [];
    const warning: IContractApproval[] = [];
    approvals.forEach((approval) => {
      if (approval.isRiskContract) {
        risk.push(approval);
      } else if (approval.isInactiveApproval) {
        warning.push(approval);
      }
    });
    return { riskApprovals: risk, warningApprovals: warning };
  }, [approvals]);

  const riskyDelegationsCount = useMemo(
    () =>
      getEip7702DemoDelegations({ networkId, isAllNetworks }).filter(
        (d) => !!d.riskReason,
      ).length,
    [networkId, isAllNetworks],
  );

  const riskyNumber = riskApprovals.length + riskyDelegationsCount;
  const inactiveNumber = warningApprovals.length;

  const { result: shouldShow } = usePromiseResult(async () => {
    if (!initialized || (riskyNumber === 0 && inactiveNumber === 0)) {
      return false;
    }
    const [showInactive, showRisk] = await Promise.all([
      backgroundApiProxy.serviceApproval.shouldShowInactiveApprovalsAlert({
        accountId,
        networkId,
      }),
      backgroundApiProxy.serviceApproval.shouldShowRiskApprovalsAlert({
        accountId,
        networkId,
      }),
    ]);
    return (
      (showInactive && inactiveNumber > 0) || (showRisk && riskyNumber > 0)
    );
  }, [initialized, accountId, networkId, riskyNumber, inactiveNumber]);

  const handlePress = useCallback(() => {
    navigation.pushModal(EModalRoutes.ApprovalManagementModal, {
      screen: EModalApprovalManagementRoutes.RevokeSuggestion,
      params: {
        approvals: [...riskApprovals, ...warningApprovals],
        contractMap,
        tokenMap,
        accountId,
        networkId,
        indexedAccountId,
      },
    });
    const tasks: Promise<void>[] = [];
    if (riskyNumber > 0) {
      tasks.push(
        backgroundApiProxy.serviceApproval.updateRiskApprovalsAlertConfig({
          accountId,
          networkId,
        }),
      );
    }
    if (inactiveNumber > 0) {
      tasks.push(
        backgroundApiProxy.serviceApproval.updateInactiveApprovalsAlertConfig({
          accountId,
          networkId,
        }),
      );
    }
    void Promise.all(tasks);
  }, [
    navigation,
    riskApprovals,
    warningApprovals,
    contractMap,
    tokenMap,
    accountId,
    networkId,
    indexedAccountId,
    riskyNumber,
    inactiveNumber,
  ]);

  if (!shouldShow) {
    return null;
  }

  const isRisky = riskyNumber > 0;
  const summary = [
    isRisky ? DEMO_COPY.risky(riskyNumber) : '',
    inactiveNumber > 0 ? DEMO_COPY.unused(inactiveNumber) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <XStack
      testID="approval-list-revoke-suggestion-pill"
      alignItems="center"
      gap="$1"
      pl="$2"
      pr="$1"
      py="$1"
      borderRadius="$full"
      bg="$bgStrong"
      hoverStyle={{ bg: '$bgStrongHover' }}
      pressStyle={{ bg: '$bgStrongActive' }}
      onPress={handlePress}
      userSelect="none"
    >
      <Icon
        name="ShieldExclamationOutline"
        size="$4"
        color={isRisky ? '$iconCritical' : '$iconSubdued'}
      />
      <SizableText size="$bodySmMedium" color="$text">
        {summary}
      </SizableText>
      <Icon name="ChevronRightSmallOutline" size="$4" color="$iconSubdued" />
    </XStack>
  );
}

export default memo(RevokeSuggestionPill);
