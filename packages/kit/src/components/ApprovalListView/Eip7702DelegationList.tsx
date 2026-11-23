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
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';

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
  desc: "Each network can delegate your address to one contract. Revoke any you don't recognize.",
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
          // The dot hangs off the text so the label stays centered like the
          // plain string option.
          label: ({ color }) => (
            <XStack justifyContent="center">
              <Stack>
                <SizableText
                  size="$bodyMdMedium"
                  textAlign="center"
                  numberOfLines={1}
                  color={color}
                >
                  {DEMO_COPY.eip7702}
                </SizableText>
                {hasRisk ? (
                  <Stack
                    position="absolute"
                    right={-10}
                    top={2}
                    w="$1.5"
                    h="$1.5"
                    borderRadius="$full"
                    bg="$bgCriticalStrong"
                  />
                ) : null}
              </Stack>
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
  const name =
    delegation.label ||
    intl.formatMessage({ id: ETranslations.global_unknown });

  const riskBadge = delegation.riskReason ? (
    <Badge badgeSize="sm" badgeType="critical">
      <Badge.Text>
        {intl.formatMessage({ id: ETranslations.global_risk })}
      </Badge.Text>
    </Badge>
  ) : null;

  const riskReason = delegation.riskReason ? (
    <RiskReason reason={delegation.riskReason} />
  ) : null;

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

  // Each network holds at most one delegation, so the network leads the row.
  const networkName = (
    <XStack alignItems="center" gap="$1.5">
      <ContractNetworkView
        networkId={delegation.networkId}
        networkStyleProps={{
          size: '$bodyLgMedium',
          color: '$text',
          numberOfLines: 1,
        }}
      />
      {riskBadge}
    </XStack>
  );

  if (tableLayout) {
    return (
      <ListItem userSelect="none" gap="$3" alignItems="center">
        <XStack alignItems="center" gap="$3" flexGrow={1} flexBasis={0}>
          <NetworkAvatar networkId={delegation.networkId} size="$10" />
          {networkName}
        </XStack>
        <YStack flexGrow={2} flexBasis={0} gap="$1">
          <XStack alignItems="center" gap="$2">
            <Token
              isNFT
              size="xs"
              tokenImageUri={delegation.logoURI}
              fallbackIcon="Document2Outline"
            />
            <SizableText size="$bodyMdMedium" numberOfLines={1}>
              {name}
            </SizableText>
            <ContractAddressView
              address={delegation.delegateAddress}
              networkId={delegation.networkId}
              showShortAddress
              showCopy
              showExternalLink
              addressStyleProps={{ size: '$bodyMd', color: '$textSubdued' }}
            />
          </XStack>
          {riskReason}
        </YStack>
        <XStack w="$24" jc="flex-end">
          {revokeButton}
        </XStack>
      </ListItem>
    );
  }

  // The icon and button stay centered on the two text lines; the risk reason
  // hangs below, aligned with the text column.
  return (
    <ListItem userSelect="none">
      <YStack flex={1} gap="$1.5">
        <XStack alignItems="center" gap="$3">
          <NetworkAvatar networkId={delegation.networkId} size="$10" />
          <YStack flex={1} gap="$0.5">
            {networkName}
            <SizableText size="$bodyMd" color="$textSubdued" numberOfLines={1}>
              {`${name} · ${accountUtils.shortenAddress({
                address: delegation.delegateAddress,
                leadingLength: 6,
                trailingLength: 4,
              })}`}
            </SizableText>
          </YStack>
          {revokeButton}
        </XStack>
        {riskReason ? (
          <XStack gap="$3">
            <Stack w="$10" />
            <Stack flex={1}>{riskReason}</Stack>
          </XStack>
        ) : null}
      </YStack>
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
          <Stack flexGrow={2} flexBasis={0}>
            <HeaderLabel label={DEMO_COPY.delegatedTo} />
          </Stack>
          <Stack w="$24" />
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
