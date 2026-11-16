import {
  LottieView,
  Stack,
  useMedia,
  usePageWidth,
} from '@onekeyhq/components';
import { useThemeVariant } from '@onekeyhq/kit/src/hooks/useThemeVariant';
import { useReferLottieSource } from '@onekeyhq/kit/src/views/ReferFriends/hooks/useReferLottieSource';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

// Short enough that the desktop modal fits the bind footer without scrolling.
const DESKTOP_ASPECT_RATIO = 240 / 640;
const DESKTOP_WIDTH = 640;
// The composition is 786×446. Sizing the mobile frame to it, rather than to
// a square, drops the empty bands above and below the artwork so the bind
// controls stay on the first screen.
const MOBILE_ASPECT_RATIO = 446 / 786;

export function InvitedByFriendImage() {
  const { gtSm } = useMedia();
  const themeVariant = useThemeVariant();
  const pageWidth = usePageWidth();
  const lottieSource = useReferLottieSource();

  const isDesktop =
    !platformEnv.isNative && (gtSm || platformEnv.isExtensionUiPopup);
  const renderMode =
    platformEnv.isNativeIOS && themeVariant !== 'dark' ? 'HARDWARE' : undefined;
  const width = !platformEnv.isNative && gtSm ? DESKTOP_WIDTH : pageWidth;
  const height =
    width * (isDesktop ? DESKTOP_ASPECT_RATIO : MOBILE_ASPECT_RATIO);

  return (
    <Stack w={width} h={height} alignSelf="center" bg="$bgApp">
      {lottieSource ? (
        <LottieView
          source={lottieSource}
          width={width}
          height={height}
          autoPlay
          loop
          resizeMode="contain"
          renderMode={renderMode}
          backgroundColor="$bgApp"
        />
      ) : null}
    </Stack>
  );
}
