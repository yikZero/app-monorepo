import { useWindowDimensions } from 'react-native';

import { Image, useMedia, usePageWidth } from '@onekeyhq/components';
import { useThemeVariant } from '@onekeyhq/kit/src/hooks/useThemeVariant';
import {
  getInviteCodeStepImageHeight,
  getInviteCodeStepImageWidth,
} from '@onekeyhq/kit/src/views/ReferFriends/pages/ReferAFriend/components/InviteCodeStepImage';

// In the desktop modal the full 480pt art pushes the bind footer below the
// fold; this keeps the whole page on one screen.
const DESKTOP_MAX_WIDTH = 360;
// On short phones (iPhone SE) the full-width art leaves no room for the
// hero and the bind footer; cap its height to a share of the window.
const MAX_HEIGHT_SHARE_OF_WINDOW = 0.26;

// The same still the invite home shows, so both sides of an invite share one
// illustration, and the page paints at once instead of waiting on a Lottie.
export function InvitedByFriendImage() {
  const isDark = useThemeVariant() === 'dark';
  const pageWidth = usePageWidth();
  const { gtMd } = useMedia();
  const { height: windowHeight } = useWindowDimensions();
  const width = getInviteCodeStepImageWidth(pageWidth);
  const height = getInviteCodeStepImageHeight(pageWidth);
  const scale = gtMd
    ? Math.min(1, DESKTOP_MAX_WIDTH / width)
    : Math.min(1, (windowHeight * MAX_HEIGHT_SHARE_OF_WINDOW) / height);

  return (
    <Image
      w={width * scale}
      h={height * scale}
      alignSelf="center"
      resizeMode="contain"
      source={
        isDark
          ? require('@onekeyhq/kit/assets/referral_invite_hero_dark.png')
          : require('@onekeyhq/kit/assets/referral_invite_hero.png')
      }
    />
  );
}
