import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIntl } from 'react-intl';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  View,
} from 'react-native';

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
import {
  SecurityCheckCard,
  TransactionPreview,
  buildSecurityCheckModel,
} from '@onekeyhq/kit/src/views/SignatureConfirm/components/SecurityCheckCard';
import { SignatureConfirmItem } from '@onekeyhq/kit/src/views/SignatureConfirm/components/SignatureConfirmItem';
import { SignatureConfirmTestIDs } from '@onekeyhq/kit/src/views/SignatureConfirm/testIDs';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { PRIME_DEMO_ASSET_URIS, getPrimeDemoTokenIconUri } from './assetUris';
import {
  buildPrimeDemoMessageDisplay,
  buildPrimeDemoSimulationComponents,
  buildPrimeDemoUnsignedMessage,
  buildPrimeDemoUrlSecurityInfo,
} from './buildSceneModel';
import { reportPrimeDemoMarker } from './reportMarker';
import { PrimeDemoTestIDs } from './testIDs';

import type { IPrimeDemoFixture } from './types';

type IProps = {
  fixture: IPrimeDemoFixture;
  sceneKey: string;
  onClose: () => void;
};

function HiddenCompleteMarker() {
  return (
    <View
      testID={PrimeDemoTestIDs.AnimationsComplete}
      collapsable={false}
      pointerEvents="none"
      style={{ width: 0, height: 0, position: 'absolute' }}
    />
  );
}

export function PrimeDemoConfirmScene({ fixture, sceneKey, onClose }: IProps) {
  const intl = useIntl();
  const [continueOperate, setContinueOperate] = useState(false);
  const [laserComplete, setLaserComplete] = useState(false);
  const [shimmerComplete, setShimmerComplete] = useState(false);
  const startedAtRef = useRef(globalThis.performance.now());
  const tapPointRef = useRef<{ x: number; y: number } | null>(null);
  const riskAckReportedRef = useRef(false);
  const sceneReadyReportedRef = useRef(false);

  const unsignedMessage = useMemo(() => buildPrimeDemoUnsignedMessage(), []);
  const urlSecurityInfo = useMemo(
    () => buildPrimeDemoUrlSecurityInfo(fixture),
    [fixture],
  );
  const messageDisplay = useMemo(
    () => buildPrimeDemoMessageDisplay(fixture),
    [fixture],
  );
  const simulationComponents = useMemo(
    () => buildPrimeDemoSimulationComponents(fixture),
    [fixture],
  );
  const requestKey = `${sceneKey}|${fixture.outgoing.amount}|${fixture.incoming.amount}`;
  const securityCheckModel = useMemo(
    () =>
      buildSecurityCheckModel({
        kind: 'message',
        requestKey,
        origin: fixture.origin,
        urlSecurityInfo,
        messageDisplay,
        unsignedMessage,
        intl,
      }),
    [
      fixture.origin,
      intl,
      messageDisplay,
      requestKey,
      unsignedMessage,
      urlSecurityInfo,
    ],
  );

  const handleLaserComplete = useCallback(() => {
    reportPrimeDemoMarker({
      name: 'laserComplete',
      tMs: globalThis.performance.now() - startedAtRef.current,
      sceneKey,
    });
    setLaserComplete(true);
  }, [sceneKey]);

  const handleShimmerComplete = useCallback(() => {
    reportPrimeDemoMarker({
      name: 'shimmerComplete',
      tMs: globalThis.performance.now() - startedAtRef.current,
      sceneKey,
    });
    setShimmerComplete(true);
  }, [sceneKey]);

  const handleCheckboxLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (sceneReadyReportedRef.current) {
        return;
      }
      if (!(width > 0 && height > 0)) {
        return;
      }
      sceneReadyReportedRef.current = true;
      reportPrimeDemoMarker({
        name: 'sceneReady',
        tMs: globalThis.performance.now() - startedAtRef.current,
        sceneKey,
        extra: {
          width,
          height,
          meaning:
            'risk checkbox target has a positive native layout; not images or animations complete',
        },
      });
    },
    [sceneKey],
  );

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

  const animationsComplete = laserComplete && shimmerComplete;

  useEffect(() => {
    reportPrimeDemoMarker({
      name: 'cardMounted',
      tMs: 0,
      sceneKey,
    });
  }, [sceneKey]);

  useEffect(() => {
    if (!animationsComplete) {
      return;
    }
    reportPrimeDemoMarker({
      name: 'animationsComplete',
      tMs: globalThis.performance.now() - startedAtRef.current,
      sceneKey,
    });
  }, [animationsComplete, sceneKey]);

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

  return (
    <YStack flex={1} bg="$bgApp">
      {animationsComplete ? <HiddenCompleteMarker /> : null}
      <ScrollView flex={1}>
        <YStack px="$5" pt="$2" pb="$5" gap="$5">
          <DAppSiteMark
            origin={fixture.origin}
            urlSecurityInfo={urlSecurityInfo}
            favicon={PRIME_DEMO_ASSET_URIS.uniswap}
          />
          <SecurityCheckCard model={securityCheckModel} />
          <TransactionPreview
            simulationComponents={simulationComponents}
            onLaserAnimationComplete={handleLaserComplete}
            onShimmerAnimationComplete={handleShimmerComplete}
          />
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
              {fixture.approveLabel}
            </SignatureConfirmItem.Label>
            <XStack gap="$3" alignItems="center">
              <Token
                size="lg"
                tokenImageUri={getPrimeDemoTokenIconUri(fixture.approveSymbol)}
              />
              <SizableText size="$headingMd">
                {`${fixture.approveAmount}  ${fixture.approveSymbol}`}
              </SizableText>
            </XStack>
          </SignatureConfirmItem>
        </YStack>
      </ScrollView>
      <YStack bg="$bgApp">
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
              onLayout: handleCheckboxLayout,
            }}
          />
        </YStack>
        <XStack p="$5" gap="$2.5">
          <Button
            flexGrow={1}
            flexBasis={0}
            size="large"
            testID="page-footer-cancel"
            onPress={onClose}
          >
            {intl.formatMessage({ id: ETranslations.global_cancel })}
          </Button>
          <Button
            flexGrow={1}
            flexBasis={0}
            size="large"
            variant="destructive"
            disabled={!continueOperate}
            testID="page-footer-confirm"
            onPress={onClose}
          >
            {intl.formatMessage({ id: ETranslations.dapp_connect_confirm })}
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
