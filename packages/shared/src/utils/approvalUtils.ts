import type { IContractApproval } from '@onekeyhq/shared/types/approval';
import { EContractApprovalAlertType } from '@onekeyhq/shared/types/approval';

function buildSelectedTokenKey({
  contractAddress,
  tokenAddress,
  networkId,
  accountId,
}: {
  contractAddress: string;
  tokenAddress: string;
  networkId: string;
  accountId: string;
}) {
  return `${accountId}_${networkId}_${contractAddress}_${tokenAddress}`;
}

function parseSelectedTokenKey({
  selectedTokenKey,
}: {
  selectedTokenKey: string;
}) {
  const [accountId, networkId, contractAddress, tokenAddress] =
    selectedTokenKey.split('_');

  return {
    accountId,
    networkId,
    contractAddress,
    tokenAddress,
  };
}

function buildToggleSelectAllTokensMap({
  approvals,
  toggle,
}: {
  approvals: IContractApproval[];
  toggle: boolean;
}) {
  const selectedTokensTemp: Record<string, boolean> = {};
  approvals.forEach((item) => {
    item.approvals.forEach((approval) => {
      selectedTokensTemp[
        buildSelectedTokenKey({
          contractAddress: item.contractAddress,
          tokenAddress: approval.tokenAddress,
          networkId: item.networkId,
          accountId: item.accountId,
        })
      ] = toggle;
    });
  });
  return selectedTokensTemp;
}

function checkIsSelectAllTokens({
  approvals,
  selectedTokens,
}: {
  approvals: IContractApproval[];
  selectedTokens: Record<string, boolean>;
}) {
  let selectedCount = 0;
  let totalCount = 0;
  let isSelectAllTokens: boolean | 'indeterminate' = false;
  for (const approval of approvals) {
    for (const item of approval.approvals) {
      totalCount += 1;
      if (
        selectedTokens[
          buildSelectedTokenKey({
            networkId: approval.networkId,
            contractAddress: approval.contractAddress,
            tokenAddress: item.tokenAddress,
            accountId: approval.accountId,
          })
        ]
      ) {
        selectedCount += 1;
      }
    }
  }

  if (selectedCount === totalCount) {
    isSelectAllTokens = true;
  } else if (selectedCount > 0) {
    isSelectAllTokens = 'indeterminate';
  }

  return {
    isSelectAllTokens,
    totalCount,
    selectedCount,
  };
}

function buildContractMapKey({
  networkId,
  contractAddress,
}: {
  networkId: string;
  contractAddress: string;
}) {
  return `${networkId}_${contractAddress}`;
}

function buildTokenMapKey({
  networkId,
  tokenAddress,
}: {
  networkId: string;
  tokenAddress: string;
}) {
  return `${networkId}_${tokenAddress}`;
}

function checkIsExistRiskApprovals({
  contractApprovals,
}: {
  contractApprovals: IContractApproval[];
}) {
  return contractApprovals.some((item) => item.isRiskContract);
}

// Additional helpers for approval classification and UI decisions
export function categorizeApprovalsByRisk({
  approvals,
}: {
  approvals: IContractApproval[];
}): {
  riskApprovals: IContractApproval[];
  inactiveApprovals: IContractApproval[];
  hasRiskApprovals: boolean;
  hasInactiveApprovals: boolean;
} {
  const riskApprovals: IContractApproval[] = [];
  const inactiveApprovals: IContractApproval[] = [];

  approvals.forEach((item) => {
    if (item.isRiskContract) {
      riskApprovals.push(item);
    } else if (item.isInactiveApproval) {
      inactiveApprovals.push(item);
    }
  });

  return {
    riskApprovals,
    inactiveApprovals,
    hasRiskApprovals: riskApprovals.length > 0,
    hasInactiveApprovals: inactiveApprovals.length > 0,
  };
}

export function deriveRevokeSuggestionAlertType({
  hasRiskApprovals,
  hasInactiveApprovals,
}: {
  hasRiskApprovals: boolean;
  hasInactiveApprovals: boolean;
}): EContractApprovalAlertType | undefined {
  if (hasRiskApprovals) return EContractApprovalAlertType.Risk;
  if (hasInactiveApprovals) return EContractApprovalAlertType.Warning;
  return undefined;
}

export default {
  buildContractMapKey,
  buildTokenMapKey,
  buildSelectedTokenKey,
  parseSelectedTokenKey,
  buildToggleSelectAllTokensMap,
  checkIsSelectAllTokens,
  checkIsExistRiskApprovals,
  categorizeApprovalsByRisk,
  deriveRevokeSuggestionAlertType,
};
