import { memo, useCallback } from 'react';

import { useIntl } from 'react-intl';

import {
  Badge,
  Button,
  Icon,
  SegmentControl,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';

import useAppNavigation from '../../hooks/useAppNavigation';
import { ListItem } from '../ListItem';
import { NetworkAvatar } from '../NetworkAvatar';
import { Token } from '../Token';

import ContractAddressView from './ContractAddressView';
import ContractNetworkView from './ContractNetworkView';

import type { IEip7702DelegationDemo } from './eip7702DemoData';

// Demo copy (OK-67574), not yet in onekey-i18n.
const DEMO_COPY = {
  tokenApprovals: 'Token approvals',
  eip7702: 'EIP-7702',
  desc: 'Contracts that can act on behalf of your address. Revoking clears the delegation on that network.',
  delegatedTo: 'Delegated to',
};

export enum EApprovalListType {
  TokenApprovals = 'token',
  Eip7702 = 'eip7702',
}

export function ApprovalTypeSegment({
  value,
  onChange,
  delegations,
  fullWidth,
}: {
  value: EApprovalListType;
  onChange: (value: EApprovalListType) => void;
  delegations: IEip7702DelegationDemo[];
  fullWidth?: boolean;
}) {
  const hasRisk = delegations.some((d) => !!d.riskReason);
  return (
    <SegmentControl
      fullWidth={fullWidth}
      value={value}
      onChange={(v) => onChange(v as EApprovalListType)}
      options={[
        {
          label: DEMO_COPY.tokenApprovals,
          value: EApprovalListType.TokenApprovals,
          testID: 'approval-list-type-token',
        },
        {
          label: ({ color }) => (
            <XStack alignItems="center" gap="$1.5">
              <SizableText size="$bodyMdMedium" color={color}>
                {`${DEMO_COPY.eip7702} (${delegations.length})`}
              </SizableText>
              {hasRisk ? (
                <Stack
                  w="$1.5"
                  h="$1.5"
                  borderRadius="$full"
                  bg="$bgCriticalStrong"
                />
              ) : null}
            </XStack>
          ),
          value: EApprovalListType.Eip7702,
          testID: 'approval-list-type-eip7702',
        },
      ]}
    />
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

function DelegateView({
  delegation,
  withLinks,
}: {
  delegation: IEip7702DelegationDemo;
  withLinks?: boolean;
}) {
  const intl = useIntl();
  const name =
    delegation.label ||
    intl.formatMessage({ id: ETranslations.global_unknown });
  return (
    <XStack alignItems="center" gap="$1.5" flexWrap="wrap">
      <Token
        isNFT
        size="xs"
        tokenImageUri={delegation.logoURI}
        fallbackIcon="Document2Outline"
      />
      <SizableText size="$bodyMd" color="$textSubdued" numberOfLines={1}>
        {name}
      </SizableText>
      <ContractAddressView
        address={delegation.delegateAddress}
        networkId={delegation.networkId}
        showShortAddress
        showCopy
        showExternalLink={withLinks}
        addressStyleProps={{
          size: '$bodyMd',
          color: '$textSubdued',
        }}
      />
    </XStack>
  );
}

function DelegationItem({
  delegation,
  tableLayout,
  onRevoke,
}: {
  delegation: IEip7702DelegationDemo;
  tableLayout?: boolean;
  onRevoke?: (delegation: IEip7702DelegationDemo) => void;
}) {
  const intl = useIntl();

  // Each network holds at most one delegation, so the network leads the row.
  const networkView = (
    <XStack alignItems="center" gap="$3" flex={1}>
      <NetworkAvatar networkId={delegation.networkId} size="$10" />
      <YStack flex={1}>
        <XStack alignItems="center" gap="$1">
          <ContractNetworkView
            networkId={delegation.networkId}
            networkStyleProps={{ size: '$bodyLgMedium', color: '$text' }}
          />
          {delegation.riskReason ? (
            <Badge badgeSize="sm" badgeType="critical">
              <Badge.Text>
                {intl.formatMessage({ id: ETranslations.global_risk })}
              </Badge.Text>
            </Badge>
          ) : null}
        </XStack>
        {tableLayout ? null : <DelegateView delegation={delegation} />}
      </YStack>
    </XStack>
  );

  const revokeButton = onRevoke ? (
    <Button
      testID="approval-list-eip7702-revoke-btn"
      size="small"
      variant={delegation.riskReason ? 'destructive' : 'secondary'}
      onPress={() => onRevoke(delegation)}
    >
      {intl.formatMessage({ id: ETranslations.global_revoke })}
    </Button>
  ) : null;

  if (tableLayout) {
    return (
      <ListItem userSelect="none" gap="$3" alignItems="center">
        <XStack flexGrow={1} flexBasis={0}>
          {networkView}
        </XStack>
        <Stack flexGrow={1} flexBasis={0}>
          <DelegateView delegation={delegation} withLinks />
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
    <ListItem userSelect="none" gap="$3" alignItems="center">
      <YStack flex={1} gap="$1.5">
        {networkView}
        {delegation.riskReason ? (
          <Stack pl="$13">
            <RiskReason reason={delegation.riskReason} />
          </Stack>
        ) : null}
      </YStack>
      {revokeButton}
    </ListItem>
  );
}

function HeaderLabel({ label }: { label: string }) {
  return (
    <SizableText size="$bodyMdMedium" color="$textSubdued" userSelect="none">
      {label}
    </SizableText>
  );
}

function Eip7702DelegationList({
  delegations,
  tableLayout,
  revokeDisabled,
}: {
  delegations: IEip7702DelegationDemo[];
  tableLayout?: boolean;
  // Watch-only wallets can see delegations but cannot revoke them.
  revokeDisabled?: boolean;
}) {
  const intl = useIntl();
  const navigation = useAppNavigation();

  const handleRevoke = useCallback(
    (delegation: IEip7702DelegationDemo) => {
      navigation.pushModal(EModalRoutes.ApprovalManagementModal, {
        screen: EModalApprovalManagementRoutes.Eip7702RevokeConfirm,
        params: {
          networkId: delegation.networkId,
          delegateAddress: delegation.delegateAddress,
          delegateLabel: delegation.label,
          riskReason: delegation.riskReason,
        },
      });
    },
    [navigation],
  );

  return (
    <YStack pb="$5">
      <SizableText
        px="$pagePadding"
        pt="$1"
        pb="$2"
        size="$bodyMd"
        color="$textSubdued"
      >
        {DEMO_COPY.desc}
      </SizableText>
      {tableLayout ? (
        <ListItem>
          <Stack flexGrow={1} flexBasis={0}>
            <HeaderLabel
              label={intl.formatMessage({ id: ETranslations.network__network })}
            />
          </Stack>
          <Stack flexGrow={1} flexBasis={0}>
            <HeaderLabel label={DEMO_COPY.delegatedTo} />
          </Stack>
          <Stack flexGrow={1} flexBasis={0}>
            <HeaderLabel
              label={intl.formatMessage({ id: ETranslations.global_risk })}
            />
          </Stack>
          <Stack flexGrow={1} flexBasis={0} maxWidth="$36" />
        </ListItem>
      ) : null}
      {delegations.map((delegation) => (
        <DelegationItem
          key={`${delegation.networkId}_${delegation.delegateAddress}`}
          delegation={delegation}
          tableLayout={tableLayout}
          onRevoke={revokeDisabled ? undefined : handleRevoke}
        />
      ))}
    </YStack>
  );
}

export default memo(Eip7702DelegationList);
