import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIntl } from 'react-intl';
import { type GestureResponderEvent } from 'react-native';

import {
  Badge,
  Button,
  Checkbox,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { NetworkAvatarBase } from '@onekeyhq/kit/src/components/NetworkAvatar';
import { Token } from '@onekeyhq/kit/src/components/Token';
import { DAppSiteMark } from '@onekeyhq/kit/src/views/DAppConnection/components/DAppRequestLayout';
import { SecurityCheckCard } from '@onekeyhq/kit/src/views/SignatureConfirm/components/SecurityCheckCard';
import { SignatureConfirmItem } from '@onekeyhq/kit/src/views/SignatureConfirm/components/SignatureConfirmItem';
import { SignatureConfirmTestIDs } from '@onekeyhq/kit/src/views/SignatureConfirm/testIDs';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { PRIME_DEMO_ASSET_URIS, getPrimeDemoTokenIconUri } from './assetUris';
import { reportPrimeDemoMarker } from './reportMarker';
import { PrimeDemoTestIDs } from './testIDs';
import {
  buildTransactionSecurityDemoCheckModel,
  buildTransactionSecurityDemoJsonRpc,
  buildTransactionSecurityDemoUrlSecurityInfo,
  getTransactionSecurityDemoApproval,
  getTransactionSecurityDemoDisplayOrigin,
  getTransactionSecurityDemoScanDelayMs,
} from './transactionSecurityDemoModel';
import { TRANSACTION_SECURITY_DEMO_FINDING_ID } from './types';

import type { ITransactionSecurityDemoFixture } from './types';

export function TransactionSecurityDemoConfirmScene({
  fixture,
  sceneKey,
  onCancel,
}: {
  fixture: ITransactionSecurityDemoFixture;
  sceneKey: string;
  onCancel: () => void;
}) {
  const intl = useIntl();
  const [continueOperate, setContinueOperate] = useState(false);
  const [isScanPending, setIsScanPending] = useState(true);
  const startedAtRef = useRef(globalThis.performance.now());
  const tapPointRef = useRef<{ x: number; y: number } | null>(null);
  const riskAckReportedRef = useRef(false);
  const pendingReportedRef = useRef(false);
  const resultReportedRef = useRef(false);

  const urlSecurityInfo = useMemo(
    () => buildTransactionSecurityDemoUrlSecurityInfo(fixture),
    [fixture],
  );
  const approval = useMemo(
    () => getTransactionSecurityDemoApproval(fixture),
    [fixture],
  );
  const jsonRpc = useMemo(
    () => buildTransactionSecurityDemoJsonRpc(fixture),
    [fixture],
  );
  const model = useMemo(
    () =>
      buildTransactionSecurityDemoCheckModel({
        fixture,
        intl,
        sceneKey,
        isScanPending,
      }),
    [fixture, intl, isScanPending, sceneKey],
  );

  useEffect(() => {
    const delayMs = getTransactionSecurityDemoScanDelayMs(fixture);
    const timer = setTimeout(() => {
      setIsScanPending(false);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [fixture]);

  useEffect(() => {
    if (!model.isPending || pendingReportedRef.current) {
      return;
    }
    pendingReportedRef.current = true;
    reportPrimeDemoMarker({
      name: 'securityPending',
      tMs: globalThis.performance.now() - startedAtRef.current,
      sceneKey,
      extra: {
        modelStatus: model.status,
        confirmation: model.confirmation,
        coverage: model.coverage,
        request: {
          method: jsonRpc.method,
          origin: fixture.origin,
          fake: true,
          liveBackend: false,
        },
      },
    });
  }, [
    fixture.origin,
    jsonRpc.method,
    model.confirmation,
    model.coverage,
    model.isPending,
    model.status,
    sceneKey,
  ]);

  useEffect(() => {
    if (
      isScanPending ||
      model.isPending ||
      model.status !== 'critical' ||
      resultReportedRef.current
    ) {
      return;
    }
    const finding = model.findings.find(
      (item) => item.id === TRANSACTION_SECURITY_DEMO_FINDING_ID,
    );
    if (!finding) {
      return;
    }
    resultReportedRef.current = true;
    reportPrimeDemoMarker({
      name: 'securityResultReady',
      tMs: globalThis.performance.now() - startedAtRef.current,
      sceneKey,
      extra: {
        modelStatus: model.status,
        confirmation: model.confirmation,
        coverage: model.coverage,
        findingId: finding.id,
        request: {
          method: jsonRpc.method,
          origin: fixture.origin,
          fake: true,
          liveBackend: false,
        },
      },
    });
  }, [
    fixture.origin,
    isScanPending,
    jsonRpc.method,
    model.confirmation,
    model.coverage,
    model.findings,
    model.isPending,
    model.status,
    sceneKey,
  ]);

  useEffect(() => {
    if (!continueOperate || riskAckReportedRef.current) {
      return;
    }
    riskAckReportedRef.current = true;
    reportPrimeDemoMarker({
      name: 'riskAcknowledged',
      tMs: globalThis.performance.now() - startedAtRef.current,
      sceneKey,
      extra: {
        checked: true,
        ...(tapPointRef.current ? { reactRootPoint: tapPointRef.current } : {}),
      },
    });
  }, [continueOperate, sceneKey]);

  const handleRiskTouchStart = useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    if (
      typeof pageX === 'number' &&
      typeof pageY === 'number' &&
      Number.isFinite(pageX) &&
      Number.isFinite(pageY)
    ) {
      tapPointRef.current = { x: pageX, y: pageY };
    }
  }, []);

  return (
    <YStack flex={1} bg="$bgApp" testID={PrimeDemoTestIDs.Sheet}>
      <ScrollView flex={1}>
        <YStack px="$5" pt="$2" pb="$5" gap="$5">
          <DAppSiteMark
            origin={getTransactionSecurityDemoDisplayOrigin(fixture)}
            urlSecurityInfo={urlSecurityInfo}
            favicon={PRIME_DEMO_ASSET_URIS.rewards}
          />
          <SecurityCheckCard model={model} />
          <SignatureConfirmItem>
            <SignatureConfirmItem.Label>
              {intl.formatMessage({ id: ETranslations.network__network })}
            </SignatureConfirmItem.Label>
            <XStack gap="$2" alignItems="center">
              <NetworkAvatarBase
                size="$5"
                logoURI={PRIME_DEMO_ASSET_URIS.eth}
              />
              <SignatureConfirmItem.Value>
                {fixture.networkName}
              </SignatureConfirmItem.Value>
            </XStack>
          </SignatureConfirmItem>
          <SignatureConfirmItem>
            <SignatureConfirmItem.Label>
              {intl.formatMessage({
                id: ETranslations.copy_address_modal_title,
              })}
            </SignatureConfirmItem.Label>
            <SignatureConfirmItem.Value
              style={{ wordBreak: 'break-all' }}
              fontFamily="$monoMedium"
            >
              {fixture.accountAddress}
            </SignatureConfirmItem.Value>
            <XStack>
              <Badge badgeType="success" badgeSize="sm">
                {fixture.accountLabel}
              </Badge>
            </XStack>
          </SignatureConfirmItem>
          <SignatureConfirmItem>
            <SignatureConfirmItem.Label>
              Token approval
            </SignatureConfirmItem.Label>
            <XStack gap="$3" alignItems="center">
              <Token
                size="lg"
                tokenImageUri={getPrimeDemoTokenIconUri(approval.symbol)}
              />
              <SizableText size="$headingMd">
                {`${approval.amountLabel}  ${approval.symbol}`}
              </SizableText>
            </XStack>
          </SignatureConfirmItem>
          <SignatureConfirmItem>
            <SignatureConfirmItem.Label>Spender</SignatureConfirmItem.Label>
            <SignatureConfirmItem.Value
              style={{ wordBreak: 'break-all' }}
              fontFamily="$monoMedium"
            >
              {approval.spender}
            </SignatureConfirmItem.Value>
          </SignatureConfirmItem>
        </YStack>
      </ScrollView>
      <YStack bg="$bgApp">
        {model.confirmation === 'risk' ? (
          <YStack px="$5" pt="$3">
            <Checkbox
              testID={SignatureConfirmTestIDs.MessageConfirmRiskCheckbox}
              label={intl.formatMessage({
                id: ETranslations.dapp_connect_proceed_at_my_own_risk,
              })}
              value={continueOperate}
              onChange={(checked) => setContinueOperate(!!checked)}
              containerProps={{
                onTouchStart: handleRiskTouchStart,
              }}
            />
          </YStack>
        ) : null}
        <XStack p="$5" gap="$2.5">
          <Button
            flexGrow={1}
            flexBasis={0}
            size="large"
            testID={PrimeDemoTestIDs.TxCancel}
            onPress={onCancel}
          >
            {intl.formatMessage({ id: ETranslations.global_cancel })}
          </Button>
          <Button
            flexGrow={1}
            flexBasis={0}
            size="large"
            variant="destructive"
            testID="prime-demo-tx-confirm"
            disabled={model.confirmation === 'risk' ? !continueOperate : true}
          >
            {intl.formatMessage({ id: ETranslations.dapp_connect_confirm })}
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
