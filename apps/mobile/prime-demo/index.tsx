import { useEffect } from 'react';

import { hideAsync } from 'expo-splash-screen';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootSiblingParent } from 'react-native-root-siblings';

import {
  ShowToastProvider,
  Toaster,
} from '@onekeyhq/components/src/actions/Toast';
import { Portal } from '@onekeyhq/components/src/hocs/Portal';
import { ConfigProvider } from '@onekeyhq/components/src/hocs/Provider';
import { OverlayContainer } from '@onekeyhq/components/src/layouts/OverlayContainer';
import BootRecovery from '@onekeyhq/shared/src/modules/BootRecovery';

import { HyperlinkTextStub } from './HyperlinkTextStub';
import { PrimeDemoApp } from './PrimeDemoApp';

const rootStyle = { flex: 1 } as const;

if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

function PrimeDemoRoot() {
  useEffect(() => {
    void hideAsync().catch((error: unknown) => {
      console.warn(
        '[prime-demo] hide splash failed',
        error instanceof Error ? error.message : error,
      );
    });
    const timer = setTimeout(() => {
      try {
        BootRecovery.markBootSuccess();
      } catch {
        // Recovery bookkeeping must never crash the demo shell.
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={rootStyle}>
      <RootSiblingParent>
        <ConfigProvider
          theme="light"
          locale="en-US"
          HyperlinkText={HyperlinkTextStub}
        >
          <PrimeDemoApp />
          <OverlayContainer>
            <Portal.Container
              name={Portal.Constant.FULL_WINDOW_OVERLAY_PORTAL}
            />
            <ShowToastProvider />
            <Toaster />
          </OverlayContainer>
        </ConfigProvider>
      </RootSiblingParent>
    </GestureHandlerRootView>
  );
}

export default PrimeDemoRoot;
