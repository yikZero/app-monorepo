import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';

import { Button, IconButton, SizableText, YStack } from '@onekeyhq/components';
import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';

import { demoFetch } from './demoFetch';
import { loadPrimeDemoLoadedFixture } from './loadFixture';
import { PrimeDemoConfirmScene } from './PrimeDemoConfirmScene';
import { reportPrimeDemoMarker } from './reportMarker';
import { PrimeDemoTestIDs } from './testIDs';
import { TransactionSecurityDemoBrowser } from './TransactionSecurityDemoBrowser';
import { TransactionSecurityDemoConfirmScene } from './TransactionSecurityDemoConfirmScene';
import { TransactionSecurityDemoDapp } from './TransactionSecurityDemoDapp';
import {
  DEFAULT_PRIME_DEMO_COMMAND_URL,
  PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK,
} from './types';

import type {
  IPrimeDemoFixture,
  ITransactionSecurityDemoFixture,
} from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type IPrimeDemoParamList = {
  Launcher: undefined;
  Confirm: {
    sceneKey: string;
    fixture: IPrimeDemoFixture;
  };
  Browser: {
    sceneKey: string;
    fixture: ITransactionSecurityDemoFixture;
  };
  TxSecurityConfirm: {
    sceneKey: string;
    fixture: ITransactionSecurityDemoFixture;
  };
};

const Stack = createNativeStackNavigator<IPrimeDemoParamList>();
const navigationRef = createNavigationContainerRef<IPrimeDemoParamList>();

function PrimeDemoLauncher({
  hideChrome,
  onStart,
  onReset,
}: {
  hideChrome: boolean;
  onStart: () => Promise<void>;
  onReset: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const openingRef = useRef(false);

  const openScene = useCallback(async () => {
    if (openingRef.current) {
      return;
    }
    openingRef.current = true;
    setErrorMessage(null);
    try {
      await onStart();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[prime-demo] failed to open scene', message);
      setErrorMessage(message);
    } finally {
      openingRef.current = false;
    }
  }, [onStart]);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) {
        setReduceMotionEnabled(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotionEnabled(enabled);
      },
    );
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    reportPrimeDemoMarker({
      name: 'launcherReady',
      tMs: 0,
      extra: { reduceMotionEnabled },
    });
  }, [reduceMotionEnabled]);

  if (hideChrome) {
    return <YStack flex={1} bg="$bgApp" testID={PrimeDemoTestIDs.Idle} />;
  }

  return (
    <YStack
      flex={1}
      bg="$bgApp"
      justifyContent="center"
      alignItems="center"
      gap="$4"
      p="$5"
      testID={PrimeDemoTestIDs.Idle}
    >
      <SizableText size="$headingLg">SignGuard demo</SizableText>
      <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
        Idle launcher. Recording should start on this screen, then tap Start.
      </SizableText>
      {reduceMotionEnabled ? (
        <SizableText
          testID={PrimeDemoTestIDs.ReduceMotionError}
          size="$bodyMd"
          color="$textCritical"
          textAlign="center"
        >
          Reduce Motion is enabled. Disable it before capturing SignGuard
          animations.
        </SizableText>
      ) : null}
      {errorMessage ? (
        <SizableText
          testID={PrimeDemoTestIDs.FixtureError}
          size="$bodyMd"
          color="$textCritical"
          textAlign="center"
        >
          {errorMessage}
        </SizableText>
      ) : null}
      <Button
        testID={PrimeDemoTestIDs.Start}
        size="large"
        onPress={() => {
          void openScene();
        }}
      >
        Start
      </Button>
      <Button
        testID={PrimeDemoTestIDs.Reset}
        variant="tertiary"
        onPress={() => {
          setErrorMessage(null);
          onReset();
        }}
      >
        Reset
      </Button>
    </YStack>
  );
}

function PrimeDemoConfirm({
  navigation,
  route,
  onDismiss,
}: NativeStackScreenProps<IPrimeDemoParamList, 'Confirm'> & {
  onDismiss: () => void;
}) {
  const { sceneKey, fixture } = route.params;
  const [presented, setPresented] = useState(false);

  useLayoutEffect(() => {
    setPresented(false);
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (event.data.closing) {
        onDismiss();
        return;
      }
      reportPrimeDemoMarker({
        name: 'sheetVisible',
        tMs: 0,
        sceneKey,
      });
      setPresented(true);
    });
    return unsubscribe;
  }, [navigation, onDismiss, sceneKey]);

  return (
    <YStack flex={1} bg="$bgApp" testID={PrimeDemoTestIDs.Sheet}>
      {presented ? (
        <PrimeDemoConfirmScene
          key={sceneKey}
          fixture={fixture}
          sceneKey={sceneKey}
          onClose={() => {
            onDismiss();
            navigation.goBack();
          }}
        />
      ) : null}
    </YStack>
  );
}

function TransactionSecurityBrowserScreen({
  navigation,
  route,
}: NativeStackScreenProps<IPrimeDemoParamList, 'Browser'>) {
  const { sceneKey, fixture } = route.params;
  const [isScreenVisible, setIsScreenVisible] = useState(false);
  const [isDappPrepared, setIsDappPrepared] = useState(false);
  const [isDappVisible, setIsDappVisible] = useState(false);
  const [homepageVisible, setHomepageVisible] = useState(true);
  const homepageOpacity = useRef(new Animated.Value(1)).current;
  const openingDappRef = useRef(false);

  useLayoutEffect(() => {
    openingDappRef.current = false;
    homepageOpacity.setValue(1);
    setIsScreenVisible(false);
    setIsDappPrepared(false);
    setIsDappVisible(false);
    setHomepageVisible(true);
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) {
        setIsScreenVisible(true);
      }
    });
    return unsubscribe;
  }, [homepageOpacity, navigation, sceneKey]);

  const handleOpenDapp = useCallback(() => {
    if (openingDappRef.current || isDappVisible) {
      return;
    }
    openingDappRef.current = true;
    Animated.timing(homepageOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        openingDappRef.current = false;
        return;
      }
      setHomepageVisible(false);
      setIsDappVisible(true);
    });
  }, [homepageOpacity, isDappVisible]);

  const handleDappBack = useCallback(() => {
    openingDappRef.current = false;
    homepageOpacity.setValue(1);
    setIsDappVisible(false);
    setHomepageVisible(true);
  }, [homepageOpacity]);

  return (
    <YStack flex={1} bg="$bgApp">
      <TransactionSecurityDemoDapp
        key={sceneKey}
        fixture={fixture}
        sceneKey={sceneKey}
        isScreenVisible={isDappVisible}
        onPrepared={() => {
          setIsDappPrepared(true);
        }}
        onBack={handleDappBack}
        onSignatureRequested={() => {
          navigation.navigate('TxSecurityConfirm', { sceneKey, fixture });
        }}
      />
      {homepageVisible ? (
        <Animated.View
          pointerEvents="auto"
          style={[StyleSheet.absoluteFill, { opacity: homepageOpacity }]}
        >
          <TransactionSecurityDemoBrowser
            fixture={fixture}
            sceneKey={sceneKey}
            isScreenVisible={isScreenVisible}
            isDappPrepared={isDappPrepared}
            onOpenDapp={handleOpenDapp}
          />
        </Animated.View>
      ) : null}
    </YStack>
  );
}

function TransactionSecurityConfirmScreen({
  navigation,
  route,
}: NativeStackScreenProps<IPrimeDemoParamList, 'TxSecurityConfirm'>) {
  const { sceneKey, fixture } = route.params;
  const [presented, setPresented] = useState(false);
  const presentedRef = useRef(false);

  useLayoutEffect(() => {
    setPresented(false);
    presentedRef.current = false;
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (event.data.closing) {
        if (presentedRef.current) {
          reportPrimeDemoMarker({
            name: 'requestCancelled',
            tMs: 0,
            sceneKey,
            extra: { fake: true, liveBackend: false },
          });
        }
        return;
      }
      presentedRef.current = true;
      setPresented(true);
    });
    return unsubscribe;
  }, [navigation, sceneKey]);

  return (
    <YStack flex={1} bg="$bgApp">
      {presented ? (
        <TransactionSecurityDemoConfirmScene
          key={sceneKey}
          fixture={fixture}
          sceneKey={sceneKey}
          onCancel={() => {
            navigation.goBack();
          }}
        />
      ) : null}
    </YStack>
  );
}

export function PrimeDemoApp() {
  const [hideLauncherChrome, setHideLauncherChrome] = useState(false);

  const resetToIdle = useCallback(() => {
    setHideLauncherChrome(false);
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Launcher' }],
      });
    }
  }, []);

  const openDemoScene = useCallback(async () => {
    setHideLauncherChrome(true);
    try {
      const loaded = await loadPrimeDemoLoadedFixture();
      const sceneKey = `${Date.now()}-${globalThis.performance.now()}`;
      if (!navigationRef.isReady()) {
        throw new OneKeyLocalError('Prime demo navigation is not ready');
      }
      const current = navigationRef.getCurrentRoute()?.name;
      if (current && current !== 'Launcher') {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Launcher' }],
        });
      }
      if (loaded.scene === PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK) {
        navigationRef.navigate('Browser', {
          sceneKey,
          fixture: loaded.fixture,
        });
        return;
      }
      reportPrimeDemoMarker({
        name: 'sheetOpenRequested',
        tMs: 0,
        sceneKey,
      });
      navigationRef.navigate('Confirm', {
        sceneKey,
        fixture: loaded.fixture,
      });
    } catch (error) {
      setHideLauncherChrome(false);
      throw error;
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void demoFetch(DEFAULT_PRIME_DEMO_COMMAND_URL)
        .then(async (response) => {
          if (!response.ok) {
            console.warn(
              '[prime-demo] command poll HTTP',
              response.status,
              response.statusText,
            );
            return;
          }
          const payload = (await response.json()) as { action?: string };
          if (payload.action === 'start') {
            try {
              await openDemoScene();
            } catch (error) {
              console.error(
                '[prime-demo] command start failed',
                error instanceof Error ? error.message : error,
              );
            }
          }
          if (payload.action === 'reset') {
            resetToIdle();
          }
        })
        .catch((error: unknown) => {
          console.warn(
            '[prime-demo] command poll failed',
            error instanceof Error ? error.message : error,
          );
        });
    }, 300);
    return () => clearInterval(timer);
  }, [openDemoScene, resetToIdle]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Launcher" options={{ headerShown: false }}>
          {() => (
            <PrimeDemoLauncher
              hideChrome={hideLauncherChrome}
              onStart={openDemoScene}
              onReset={resetToIdle}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Browser"
          options={{ headerShown: false, freezeOnBlur: false }}
          component={TransactionSecurityBrowserScreen}
        />
        <Stack.Screen
          name="TxSecurityConfirm"
          options={({ navigation, route }) => ({
            presentation: 'modal',
            headerShown: true,
            headerShadowVisible: false,
            title: route.params.fixture.title,
            headerBackVisible: false,
            headerBackTitleVisible: false,
            headerLeft: () => null,
            headerRight: () => (
              <IconButton
                icon="CrossedLargeOutline"
                variant="tertiary"
                testID={PrimeDemoTestIDs.TxClose}
                onPress={() => {
                  navigation.goBack();
                }}
              />
            ),
          })}
          component={TransactionSecurityConfirmScreen}
        />
        <Stack.Screen
          name="Confirm"
          options={({ navigation, route }) => ({
            presentation: 'modal',
            headerShown: true,
            headerShadowVisible: false,
            title: route.params.fixture.title,
            headerBackVisible: false,
            headerBackTitleVisible: false,
            headerLeft: () => null,
            headerRight: () => (
              <IconButton
                icon="CrossedLargeOutline"
                variant="tertiary"
                testID={PrimeDemoTestIDs.Close}
                onPress={() => {
                  setHideLauncherChrome(false);
                  navigation.goBack();
                }}
              />
            ),
          })}
        >
          {(props) => (
            <PrimeDemoConfirm
              {...props}
              onDismiss={() => setHideLauncherChrome(false)}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
