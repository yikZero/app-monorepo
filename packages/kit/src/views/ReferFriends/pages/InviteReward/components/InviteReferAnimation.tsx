import { useEffect, useState } from 'react';

import { useWindowDimensions } from 'react-native';

import { LottieView, Stack } from '@onekeyhq/components';
import type { ILottieViewProps } from '@onekeyhq/components';
import { useThemeVariant } from '@onekeyhq/kit/src/hooks/useThemeVariant';

import { getInviteIllustrationSize } from './getInviteIllustrationSize';

function resolveLottieModule(module: unknown): ILottieViewProps['source'] {
  const lottieModule = module as { default?: ILottieViewProps['source'] };
  return lottieModule.default ?? (module as ILottieViewProps['source']);
}

async function loadReferLottie(themeVariant: 'light' | 'dark') {
  return themeVariant === 'dark'
    ? resolveLottieModule(
        await import('@onekeyhq/kit/assets/animations/_mov_refer_dark.json'),
      )
    : resolveLottieModule(
        await import('@onekeyhq/kit/assets/animations/_mov_refer.json'),
      );
}

export function InviteReferAnimation() {
  const themeVariant = useThemeVariant();
  const { height: windowHeight } = useWindowDimensions();
  const lottieTheme = themeVariant === 'dark' ? 'dark' : 'light';
  const { width, height } = getInviteIllustrationSize(windowHeight);
  const [source, setSource] = useState<ILottieViewProps['source'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    void loadReferLottie(lottieTheme).then((nextSource) => {
      if (!cancelled) {
        setSource(nextSource);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lottieTheme]);

  return (
    <Stack w={width} h={height} maxWidth="100%" alignSelf="center">
      {source ? (
        <LottieView
          source={source}
          width={width}
          height={height}
          autoPlay
          loop={false}
          resizeMode="contain"
        />
      ) : null}
    </Stack>
  );
}
