import { memo, useCallback, useMemo } from 'react';

import { useIntl } from 'react-intl';

import {
  Badge,
  Button,
  Icon,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';

import useAppNavigation from '../../hooks/useAppNavigation';
import { ListItem } from '../ListItem';
import { Token } from '../Token';

import { useApprovalListViewContext } from './ApprovalListViewContext';
import ContractAddressView from './ContractAddressView';
import ContractNetworkView from './ContractNetworkView';
import { EIP7702_DEMO_DELEGATIONS } from './eip7702DemoData';

import type { IEip7702DelegationDemo } from './eip7702DemoData';

// Demo copy (OK-67574), not yet in onekey-i18n.
const DEMO_COPY = {
  sectionTitle: 'EIP-7702 delegations',
  sectionDesc:
    'Your address runs code from these contracts. Revoke to switch back to a regular address.',
  tokenApprovals: 'Token approvals',
};

function SectionLabel({ label }: { label: string }) {
  return (
    <SizableText size="$headingSm" color="$textSubdued">
      {label}
    </SizableText>
  );
}

function RiskReason({ reason }: { reason: string }) {
  return (
    <XStack gap="$1" alignItems="flex-start">
      <Icon name="ErrorSolid" size="$4" color="$iconCritical" mt="$0.5" />
      <SizableText size="$bodySm" color="$textCritical" flex={1}>
        {reason}
      </SizableText>
    </XStack>
  );
}

function DelegationItem({
  delegation,
  onRevoke,
}: {
  delegation: IEip7702DelegationDemo;
  onRevoke: (delegation: IEip7702DelegationDemo) => void;
}) {
  const intl = useIntl();
  const { tableLayout } = useApprovalListViewContext();
  const name =
    delegation.label ||
    intl.formatMessage({ id: ETranslations.global_unknown });

  const icon = (
    <Token
      isNFT
      size="lg"
      networkId={delegation.networkId}
      tokenImageUri={delegation.logoURI}
      fallbackIcon="Document2Outline"
      showNetworkIcon
    />
  );

  const nameView = (
    <XStack alignItems="center" gap="$1">
      <SizableText size="$bodyLgMedium" numberOfLines={1}>
        {name}
      </SizableText>
      {delegation.riskReason ? (
        <Badge badgeSize="sm" badgeType="critical">
          <Badge.Text>
            {intl.formatMessage({ id: ETranslations.global_risk })}
          </Badge.Text>
        </Badge>
      ) : null}
    </XStack>
  );

  const revokeButton = (
    <Button
      testID="approval-list-eip7702-revoke-btn"
      size="small"
      variant={delegation.riskReason ? 'destructive' : 'secondary'}
      onPress={() => onRevoke(delegation)}
    >
      {intl.formatMessage({ id: ETranslations.global_revoke })}
    </Button>
  );

  if (tableLayout) {
    return (
      <ListItem userSelect="none" gap="$3" alignItems="center">
        <XStack alignItems="center" gap="$3" flexGrow={1} flexBasis={0}>
          {icon}
          <YStack flex={1}>
            {nameView}
            <ContractNetworkView networkId={delegation.networkId} />
          </YStack>
        </XStack>
        <Stack flexGrow={1} flexBasis={0}>
          <ContractAddressView
            address={delegation.delegateAddress}
            networkId={delegation.networkId}
            showShortAddress
            showCopy
            showExternalLink
          />
        </Stack>
        <Stack flexGrow={1} flexBasis={0}>
          {delegation.riskReason ? (
            <RiskReason reason={delegation.riskReason} />
          ) : null}
        </Stack>
        <XStack flexGrow={1} flexBasis={0} maxWidth="$36" jc="flex-end">
          {revokeButton}
        </XStack>
      </ListItem>
    );
  }

  return (
    <ListItem userSelect="none" gap="$3" alignItems="flex-start">
      {icon}
      <YStack flex={1} gap="$1">
        <YStack>
          {nameView}
          <ContractAddressView
            address={delegation.delegateAddress}
            networkId={delegation.networkId}
            showShortAddress
            showCopy
            addressStyleProps={{
              size: '$bodyMd',
              color: '$textSubdued',
            }}
          />
        </YStack>
        {delegation.riskReason ? (
          <RiskReason reason={delegation.riskReason} />
        ) : null}
      </YStack>
      <Stack pt="$1.5">{revokeButton}</Stack>
    </ListItem>
  );
}

function Eip7702DelegationSection() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const { accountId, networkId, isAllNetworks, tableLayout } =
    useApprovalListViewContext();

  const delegations = useMemo(() => {
    if (!platformEnv.isDev) {
      return [];
    }
    return isAllNetworks
      ? EIP7702_DEMO_DELEGATIONS
      : EIP7702_DEMO_DELEGATIONS.filter((d) => d.networkId === networkId);
  }, [isAllNetworks, networkId]);

  const handleRevoke = useCallback(
    (delegation: IEip7702DelegationDemo) => {
      navigation.pushModal(EModalRoutes.ApprovalManagementModal, {
        screen: EModalApprovalManagementRoutes.Eip7702RevokeConfirm,
        params: {
          accountId,
          networkId: delegation.networkId,
          delegateAddress: delegation.delegateAddress,
          delegateLabel: delegation.label,
          riskReason: delegation.riskReason,
        },
      });
    },
    [navigation, accountId],
  );

  if (delegations.length === 0) {
    return null;
  }

  return (
    <YStack pb="$2">
      <YStack px="$pagePadding" pt="$3" pb="$1" gap="$1">
        <SectionLabel
          label={`${DEMO_COPY.sectionTitle} (${delegations.length})`}
        />
        <SizableText size="$bodySm" color="$textDisabled">
          {DEMO_COPY.sectionDesc}
        </SizableText>
      </YStack>
      {tableLayout ? (
        <ListItem>
          <Stack flexGrow={1} flexBasis={0}>
            <SizableText size="$bodyMdMedium" color="$textSubdued">
              {intl.formatMessage({ id: ETranslations.global_contract })}
            </SizableText>
          </Stack>
          <Stack flexGrow={1} flexBasis={0}>
            <SizableText size="$bodyMdMedium" color="$textSubdued">
              {intl.formatMessage({
                id: ETranslations.global_contract_address,
              })}
            </SizableText>
          </Stack>
          <Stack flexGrow={1} flexBasis={0}>
            <SizableText size="$bodyMdMedium" color="$textSubdued">
              {intl.formatMessage({ id: ETranslations.global_risk })}
            </SizableText>
          </Stack>
          <Stack flexGrow={1} flexBasis={0} maxWidth="$36" />
        </ListItem>
      ) : null}
      {delegations.map((delegation) => (
        <DelegationItem
          key={`${delegation.networkId}_${delegation.delegateAddress}`}
          delegation={delegation}
          onRevoke={handleRevoke}
        />
      ))}
      <Stack px="$pagePadding" pt="$5">
        <SectionLabel label={DEMO_COPY.tokenApprovals} />
      </Stack>
    </YStack>
  );
}

export default memo(Eip7702DelegationSection);
