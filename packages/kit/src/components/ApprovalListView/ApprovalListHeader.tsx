import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { useIntl } from 'react-intl';

import { Alert, SizableText, Stack, YStack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';
import type { IContractApproval } from '@onekeyhq/shared/types/approval';

import backgroundApiProxy from '../../background/instance/backgroundApiProxy';
import useAppNavigation from '../../hooks/useAppNavigation';
import { usePromiseResult } from '../../hooks/usePromiseResult';
import {
  useApprovalListAtom,
  useContractMapAtom,
  useTokenMapAtom,
} from '../../states/jotai/contexts/approvalList';
import { ListItem } from '../ListItem';

import { useApprovalListViewContext } from './ApprovalListViewContext';

function HeaderItem({ label }: { label: string }) {
  return (
    <SizableText size="$bodyMdMedium" color="$textSubdued" userSelect="none">
      {label}
    </SizableText>
  );
}

function ApprovalListHeader({
  recomputeLayout,
}: {
  recomputeLayout: () => void;
}) {
  const intl = useIntl();

  const navigation = useAppNavigation();

  const { tableLayout, accountId, networkId } = useApprovalListViewContext();

  const [showInactiveApprovalsAlert, setShowInactiveApprovalsAlert] =
    useState(false);
  const [hideCombinedAlert, setHideCombinedAlert] = useState(false);
  const [alertOpacity, setAlertOpacity] = useState(0);
  const [tableHeaderOpacity, setTableHeaderOpacity] = useState(0);

  const { result: shouldShowInactiveApprovalsAlert } =
    usePromiseResult(async () => {
      return backgroundApiProxy.serviceApproval.shouldShowInactiveApprovalsAlert(
        {
          accountId,
          networkId,
        },
      );
    }, [accountId, networkId]);

  const [{ approvals }] = useApprovalListAtom();
  const [{ tokenMap }] = useTokenMapAtom();
  const [{ contractMap }] = useContractMapAtom();

  const renderTableHeader = useCallback(() => {
    if (!tableLayout || approvals?.length <= 0) {
      return null;
    }

    return (
      <ListItem
        testID="Wallet-Approval-List-Header"
        opacity={tableHeaderOpacity}
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
  }, [intl, tableLayout, tableHeaderOpacity, approvals?.length]);

  const handleViewApprovals = useCallback(
    ({ approvals: _approvals }: { approvals: IContractApproval[] }) => {
      navigation.pushModal(EModalRoutes.ApprovalManagementModal, {
        screen: EModalApprovalManagementRoutes.RevokeSuggestion,
        params: {
          approvals: _approvals,
          contractMap,
          tokenMap,
          accountId,
          networkId,
        },
      });
    },
    [navigation, contractMap, tokenMap, accountId, networkId],
  );

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

  const handleCloseCombinedAlert = useCallback(async () => {
    if (showInactiveApprovalsAlert) {
      await backgroundApiProxy.serviceApproval.updateInactiveApprovalsAlertConfig(
        {
          accountId,
          networkId,
        },
      );
      setShowInactiveApprovalsAlert(false);
    }
    setHideCombinedAlert(true);
    setTimeout(() => {
      recomputeLayout();
    }, 350);
  }, [accountId, networkId, recomputeLayout, showInactiveApprovalsAlert]);

  const renderRiskOverview = useCallback(() => {
    const includeInactive = showInactiveApprovalsAlert;
    const riskyNumber = riskApprovals.length;
    const inactiveNumber = includeInactive ? warningApprovals.length : 0;

    if (hideCombinedAlert || (riskyNumber === 0 && inactiveNumber === 0)) {
      return null;
    }

    const hasRisk = riskyNumber > 0;
    const hasInactive = inactiveNumber > 0;

    let descriptionId: ETranslations;
    if (hasRisk && hasInactive) {
      descriptionId = ETranslations.wallet_approval_alert_title_summary;
    } else if (hasRisk) {
      descriptionId = ETranslations.wallet_approval_risky_suggestion_title;
    } else {
      descriptionId = ETranslations.wallet_approval_inactive_suggestion_title;
    }

    let approvalsToView: IContractApproval[];
    if (hasRisk && hasInactive) {
      approvalsToView = [...riskApprovals, ...warningApprovals];
    } else if (hasRisk) {
      approvalsToView = riskApprovals;
    } else {
      approvalsToView = warningApprovals;
    }

    return (
      <YStack px="$5" py="$3" gap="$5">
        <Alert
          opacity={alertOpacity}
          onClose={handleCloseCombinedAlert}
          icon="ShieldExclamationOutline"
          title={intl.formatMessage({
            id: ETranslations.wallet_revoke_suggestion,
          })}
          description={intl.formatMessage(
            { id: descriptionId },
            {
              riskyNumber: (
                <SizableText color="$textCritical">{riskyNumber}</SizableText>
              ) as unknown as string,
              inactiveNumber: (
                <SizableText color="$textCaution">{inactiveNumber}</SizableText>
              ) as unknown as string,
              number: (
                <SizableText color={hasRisk ? '$textCritical' : '$textCaution'}>
                  {hasRisk ? riskyNumber : inactiveNumber}
                </SizableText>
              ) as unknown as string,
            },
          )}
          closable
          type={hasRisk ? 'danger' : 'warning'}
          action={{
            primary: intl.formatMessage({ id: ETranslations.global_view }),
            onPrimaryPress: () => {
              handleViewApprovals({ approvals: approvalsToView });
            },
          }}
        />
      </YStack>
    );
  }, [
    alertOpacity,
    handleCloseCombinedAlert,
    handleViewApprovals,
    hideCombinedAlert,
    intl,
    riskApprovals,
    showInactiveApprovalsAlert,
    warningApprovals,
  ]);

  useEffect(() => {
    setShowInactiveApprovalsAlert(!!shouldShowInactiveApprovalsAlert);

    setTimeout(() => {
      recomputeLayout();
      setAlertOpacity(1);
      setTableHeaderOpacity(1);
    }, 350);
  }, [shouldShowInactiveApprovalsAlert, recomputeLayout]);

  return (
    <>
      {renderRiskOverview()}
      {renderTableHeader()}
    </>
  );
}

export default memo(ApprovalListHeader);
