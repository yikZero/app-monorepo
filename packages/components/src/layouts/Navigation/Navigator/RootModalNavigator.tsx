import { useMemo } from 'react';

import { ThemeProvider } from '@react-navigation/native';

import { Theme } from '../../../content/Theme';
import { EPageType } from '../../../hocs';
import { useTheme } from '../../../hooks';
import { getTokenValue } from '../../../shared/tamagui';
import {
  makeRootModalStackOptions,
  makeRootModalThemedScreenOptions,
} from '../GlobalScreenOptions';
import { createStackNavigator } from '../StackNavigator';

import {
  TransparentDarkModalTheme,
  TransparentModalTheme,
} from './CommonConfig';
import ModalFlowNavigator from './ModalFlowNavigator';

import type { IModalFlowNavigatorConfig } from './ModalFlowNavigator';

export interface IModalRootNavigatorConfig<RouteName extends string> {
  name: RouteName;
  children: IModalFlowNavigatorConfig<any, any>[];
  onMounted?: () => void;
  onUnmounted?: () => void;
  rewrite?: string;
  exact?: boolean;
  theme?: 'light' | 'dark';
}

interface IModalNavigatorProps<RouteName extends string> {
  config: IModalRootNavigatorConfig<RouteName>[];
}

const ModalStack = createStackNavigator();

const flowThemeConfig = {
  light: {
    navigationTheme: TransparentModalTheme,
    bgToken: '$bgAppLight',
  },
  dark: {
    navigationTheme: TransparentDarkModalTheme,
    bgToken: '$bgAppDark',
  },
} as const;

export function RootModalNavigator<RouteName extends string>({
  config,
  pageType,
}: IModalNavigatorProps<RouteName> & { pageType?: EPageType }) {
  const theme = useTheme();
  const bgColor = theme.bgApp.val;
  const navigationTheme =
    pageType === EPageType.onboarding
      ? TransparentDarkModalTheme
      : TransparentModalTheme;

  const screenOptions = useMemo(
    () => makeRootModalStackOptions({ bgColor }),
    [bgColor],
  );

  const modalComponents = useMemo(
    () =>
      config.map(
        ({ name, children, onMounted, onUnmounted, theme: flowTheme }) => ({
          name,
          options: flowTheme
            ? makeRootModalThemedScreenOptions(
                getTokenValue(
                  flowThemeConfig[flowTheme].bgToken,
                  'color',
                ) as string,
              )
            : undefined,
          // eslint-disable-next-line react/no-unstable-nested-components
          children: () => {
            const navigator = (
              <ModalFlowNavigator
                config={children}
                pageType={pageType}
                name={name}
                onMounted={onMounted}
                onUnmounted={onUnmounted}
              />
            );
            if (!flowTheme) {
              return navigator;
            }
            // The navigation theme drives native-stack defaults such as the
            // iOS 26 glass header variant, so it must match the Tamagui theme.
            return (
              <ThemeProvider value={flowThemeConfig[flowTheme].navigationTheme}>
                <Theme name={flowTheme}>{navigator}</Theme>
              </ThemeProvider>
            );
          },
        }),
      ),
    [config, pageType],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <ModalStack.Navigator screenOptions={screenOptions}>
        {modalComponents.map(({ name, options, children }) => (
          <ModalStack.Screen
            key={`ROOT-Modal-${name}`}
            name={name}
            options={options}
          >
            {children}
          </ModalStack.Screen>
        ))}
      </ModalStack.Navigator>
    </ThemeProvider>
  );
}
