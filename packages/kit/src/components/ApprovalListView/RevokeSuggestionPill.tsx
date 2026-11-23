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

// Demo copy (OK-67574), not yet in onekey-i18n.
const DEMO_COPY = {
  risky: (n: number) => `${n} risky`,
  unused: (n: number) => `${n} unused`,
};

// Demo (OK-67574): the revoke suggestion as a small pill in the filter bar,
// replacing the colored banner above the list. Only the shield turns red when
// something is risky. The demo reads the existing alert settings but never
// writes them, so mock delegations cannot change a real account's reminders.
function RevokeSuggestionPill({
  accountId,
  networkId,
  indexedAccountId,
  riskyDelegationsCount,
  onViewDelegations,
}: {
  accountId: string;
  networkId: string;
  indexedAccountId?: string;
  // Counted for the whole account, matching the EIP-7702 tab.
  riskyDelegationsCount: number;
  // The suggestion page lists token approvals only; with nothing there, the
  // pill leads to the EIP-7702 tab instead.
  onViewDelegations: () => void;
}) {
  const navigation = useAppNavigation();
  const [{ approvals }] = useApprovalListAtom();
  const [{ initialized, isRefreshing }] = useApprovalListStateAtom();
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
    // The demo keeps no seen state for delegations, so a risky delegation
    // always shows the pill.
    return (
      riskyDelegationsCount > 0 ||
      (showInactive && inactiveNumber > 0) ||
      (showRisk && riskyNumber > 0)
    );
  }, [
    initialized,
    accountId,
    networkId,
    riskyNumber,
    inactiveNumber,
    riskyDelegationsCount,
  ]);

  const handlePress = useCallback(() => {
    const tokenItems = [...riskApprovals, ...warningApprovals];
    if (tokenItems.length === 0) {
      onViewDelegations();
      return;
    }
    navigation.pushModal(EModalRoutes.ApprovalManagementModal, {
      screen: EModalApprovalManagementRoutes.RevokeSuggestion,
      params: {
        approvals: tokenItems,
        contractMap,
        tokenMap,
        accountId,
        networkId,
        indexedAccountId,
      },
    });
  }, [
    navigation,
    riskApprovals,
    warningApprovals,
    contractMap,
    tokenMap,
    accountId,
    networkId,
    indexedAccountId,
    onViewDelegations,
  ]);

  // Hidden while the list reloads for another network, so the pill never
  // carries the previous network's approvals.
  if (!shouldShow || isRefreshing) {
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
      hitSlop={8}
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
