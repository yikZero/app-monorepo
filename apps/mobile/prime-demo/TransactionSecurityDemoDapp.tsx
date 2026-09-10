import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useFocusEffect } from '@react-navigation/native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import {
  Icon,
  IconButton,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from '@onekeyhq/components';

import { reportPrimeDemoMarker } from './reportMarker';
import { PrimeDemoTestIDs } from './testIDs';
import {
  TransactionSecurityDemoError,
  getTransactionSecurityDemoDappUrl,
  getTransactionSecurityDemoDisplayHost,
  isMatchingTransactionSecurityDemoRequest,
  parseTransactionSecurityDemoDappPreparedMessage,
  parseTransactionSecurityDemoDappReadyMessage,
  parseTransactionSecurityDemoEthereumRequestMessage,
  parseTransactionSecurityDemoWebViewData,
} from './transactionSecurityDemoModel';
import {
  TRANSACTION_SECURITY_DEMO_DAPP_PREPARED_TYPE,
  TRANSACTION_SECURITY_DEMO_DAPP_READY_TYPE,
  TRANSACTION_SECURITY_DEMO_ETHEREUM_REQUEST_TYPE,
} from './types';

import type { ITransactionSecurityDemoFixture } from './types';
import type {
  WebView as ReactNativeWebView,
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview';

const webViewStyle = { flex: 1 } as const;
const ORIGIN_WHITELIST = ['http://localhost:4737', 'http://127.0.0.1:4737'];
const RETRY_PREPARE_JS =
  'document.body&&document.body.offsetHeight;window.__primeDemoTryPrepare&&window.__primeDemoTryPrepare();true;';

function isLocalFixtureServerUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      parsed.port === '4737'
    );
  } catch {
    return false;
  }
}

export function TransactionSecurityDemoDapp({
  fixture,
  sceneKey,
  isScreenVisible,
  onBack,
  onPrepared,
  onSignatureRequested,
}: {
  fixture: ITransactionSecurityDemoFixture;
  sceneKey: string;
  isScreenVisible: boolean;
  onBack: () => void;
  onPrepared: () => void;
  onSignatureRequested: () => void;
}) {
  const insets = useSafeAreaInsets();
  const dappUrl = getTransactionSecurityDemoDappUrl(fixture);
  const displayHost = getTransactionSecurityDemoDisplayHost(fixture);
  const webViewRef = useRef<ReactNativeWebView | null>(null);
  const preparedRef = useRef(false);
  const readyReportedRef = useRef(false);
  const visibleReportedRef = useRef(false);
  const documentLoadReportedRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const [isPrepared, setIsPrepared] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const source = useMemo(() => ({ uri: dappUrl }), [dappUrl]);

  const reportReadyPoint = useCallback(
    (localPoint: { x: number; y: number }, extra?: Record<string, unknown>) => {
      if (readyReportedRef.current) {
        return;
      }
      readyReportedRef.current = true;
      reportPrimeDemoMarker({
        name: 'dappReady',
        tMs: 0,
        sceneKey,
        extra: {
          localPoint,
          fake: true,
          ...extra,
        },
      });
    },
    [sceneKey],
  );

  useFocusEffect(
    useCallback(() => {
      requestInFlightRef.current = false;
    }, []),
  );

  useEffect(() => {
    if (!isScreenVisible || !isPrepared || visibleReportedRef.current) {
      return;
    }
    visibleReportedRef.current = true;
    reportPrimeDemoMarker({
      name: 'dappVisible',
      tMs: 0,
      sceneKey,
      extra: {
        prepared: true,
        fake: true,
      },
    });
  }, [isPrepared, isScreenVisible, sceneKey]);

  useEffect(() => {
    if (!isScreenVisible || readyReportedRef.current) {
      return;
    }
    webViewRef.current?.injectJavaScript(RETRY_PREPARE_JS);
  }, [isScreenVisible]);

  const handleShouldStartLoad = useCallback((request: WebViewNavigation) => {
    return isLocalFixtureServerUrl(request.url);
  }, []);

  const handleLoadEnd = useCallback(() => {
    if (!documentLoadReportedRef.current) {
      documentLoadReportedRef.current = true;
      reportPrimeDemoMarker({
        name: 'dappDocumentLoadEnd',
        tMs: 0,
        sceneKey,
        extra: {
          prepared: preparedRef.current,
          visible: isScreenVisible,
        },
      });
    }
    webViewRef.current?.injectJavaScript(RETRY_PREPARE_JS);
  }, [isScreenVisible, sceneKey]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = parseTransactionSecurityDemoWebViewData(
          event.nativeEvent.data,
        );
        const record =
          payload && typeof payload === 'object'
            ? (payload as { type?: unknown })
            : null;
        if (record?.type === TRANSACTION_SECURITY_DEMO_DAPP_PREPARED_TYPE) {
          const prepared =
            parseTransactionSecurityDemoDappPreparedMessage(payload);
          if (!preparedRef.current) {
            preparedRef.current = true;
            setIsPrepared(true);
            reportPrimeDemoMarker({
              name: 'dappPrepared',
              tMs: 0,
              sceneKey,
              extra: {
                layout: prepared.layout,
                hasLocalPoint: Boolean(prepared.localPoint),
              },
            });
            onPrepared();
          }
          if (prepared.localPoint) {
            reportReadyPoint(prepared.localPoint, {
              title: prepared.title,
              url: prepared.url,
              method: prepared.method,
              documentTitle: prepared.title,
              from: 'prepared',
            });
          }
          return;
        }
        if (record?.type === TRANSACTION_SECURITY_DEMO_DAPP_READY_TYPE) {
          const readyMessage =
            parseTransactionSecurityDemoDappReadyMessage(payload);
          reportReadyPoint(readyMessage.localPoint, {
            title: readyMessage.title,
            url: readyMessage.url,
            method: readyMessage.method,
            documentTitle: readyMessage.title,
            from: 'ready',
          });
          return;
        }
        if (record?.type === TRANSACTION_SECURITY_DEMO_ETHEREUM_REQUEST_TYPE) {
          if (!isScreenVisible) {
            return;
          }
          const incoming =
            parseTransactionSecurityDemoEthereumRequestMessage(payload);
          if (
            !isMatchingTransactionSecurityDemoRequest({
              fixture,
              incoming,
            })
          ) {
            throw new TransactionSecurityDemoError(
              'dApp request does not match the fixture Permit2 payload',
            );
          }
          if (requestInFlightRef.current) {
            return;
          }
          requestInFlightRef.current = true;
          reportPrimeDemoMarker({
            name: 'signatureRequested',
            tMs: 0,
            sceneKey,
            extra: {
              method: incoming.method,
              origin: incoming.source,
              fake: true,
              liveBackend: false,
            },
          });
          onSignatureRequested();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[prime-demo] ignored dApp message', message);
        setErrorMessage(message);
      }
    },
    [
      fixture,
      isScreenVisible,
      onPrepared,
      onSignatureRequested,
      reportReadyPoint,
      sceneKey,
    ],
  );

  return (
    <YStack flex={1} bg="$bgApp">
      <XStack pt={insets.top} px="$5" alignItems="center" my="$1" gap="$2">
        <IconButton
          icon="MinimizeOutline"
          variant="tertiary"
          testID="prime-demo-dapp-back"
          onPress={() => {
            if (!isScreenVisible) {
              return;
            }
            onBack();
          }}
        />
        <XStack
          alignItems="center"
          flex={1}
          px="$2"
          py="$1.5"
          bg="$bgStrong"
          borderRadius="$3"
          borderCurve="continuous"
        >
          <Icon name="GlobusOutline" color="$iconSubdued" size="$5" />
          <SizableText
            pl="$2"
            pb="$1"
            size="$bodyLg"
            color="$textSubdued"
            flex={1}
            numberOfLines={1}
          >
            {displayHost}
          </SizableText>
        </XStack>
      </XStack>
      <View style={webViewStyle} collapsable={false}>
        <WebView
          ref={webViewRef}
          source={source}
          testID={PrimeDemoTestIDs.DappWebView}
          style={webViewStyle}
          originWhitelist={ORIGIN_WHITELIST}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          onError={(event) => {
            reportPrimeDemoMarker({
              name: 'dappLoadError',
              tMs: 0,
              sceneKey,
              extra: {
                description: event.nativeEvent.description,
                visible: isScreenVisible,
              },
            });
          }}
          javaScriptEnabled
          setSupportMultipleWindows={false}
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          mixedContentMode="never"
          incognito
        />
      </View>
      {!isPrepared && !errorMessage ? (
        <YStack
          position="absolute"
          top={insets.top + 48}
          left={0}
          right={0}
          alignItems="center"
          pointerEvents="none"
        >
          <Spinner />
        </YStack>
      ) : null}
      {errorMessage ? (
        <SizableText px="$4" py="$2" size="$bodySm" color="$textCritical">
          {errorMessage}
        </SizableText>
      ) : null}
    </YStack>
  );
}
