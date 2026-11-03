import { useCallback } from 'react';

import { EDeviceType } from '@onekeyfe/hd-shared';
import { useIntl } from 'react-intl';

import { Icon, Image, SizableText, XStack, YStack } from '@onekeyhq/components';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EPrimeGiftPages } from '@onekeyhq/shared/src/routes/prime';
import { HwWalletAvatarImages } from '@onekeyhq/shared/src/utils/avatarUtils';

import { getPrimeGiftDurationText } from '../hooks/primeGiftDuration';
import { usePrimeGiftClaimableDevices } from '../hooks/usePrimeGiftClaimableDevices';
import { usePrimeGiftOfferImpression } from '../hooks/usePrimeGiftOfferImpression';

import type { IPrimeGiftClaimableDevice } from '../hooks/primeGiftClaimableDevices';
import type { IntlShape } from 'react-intl';

const NO_CLAIMABLE_DEVICES: IPrimeGiftClaimableDevice[] = [];

const PRIME_GIFT_DASHBOARD_ENTRY_COPY = {
  eyebrow: 'OneKey Pro 2 exclusive',
  titleWithDuration: 'Claim {duration} of Prime included with your Pro 2',
  learnMore: 'Learn more',
} as const;

function dashboardEntryTitle(
  devices: IPrimeGiftClaimableDevice[],
  intl: IntlShape,
) {
  const durations = devices.map((item) =>
    getPrimeGiftDurationText(item.eligibility, intl),
  );
  const duration = durations[0];
  const sameDuration =
    Boolean(duration) && durations.every((value) => value === duration);
  if (!sameDuration || !duration) {
    return intl.formatMessage({ id: ETranslations.prime_gift__title });
  }
  return PRIME_GIFT_DASHBOARD_ENTRY_COPY.titleWithDuration.replace(
    '{duration}',
    duration,
  );
}

export function PrimeGiftDashboardEntry() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const { devices } = usePrimeGiftClaimableDevices();
  const claimable = devices ?? NO_CLAIMABLE_DEVICES;
  const deviceCount = claimable.length;
  const impressionRef = usePrimeGiftOfferImpression({
    enabled: deviceCount > 0,
    serialNo: claimable.map((item) => item.serialNo).join(',') || undefined,
    source: 'primeDashboard',
    deviceCount: deviceCount > 0 ? deviceCount : undefined,
  });
  const openIntro = useCallback(() => {
    if (!deviceCount) return;
    defaultLogger.prime.subscription.primeGiftOfferClick({
      source: 'primeDashboard',
      deviceCount,
    });
    navigation.pushModal(EModalRoutes.PrimeGiftModal, {
      screen: EPrimeGiftPages.PrimeGiftIntro,
    });
  }, [deviceCount, navigation]);
  if (!deviceCount) return null;
  return (
    <XStack px="$5" pt="$5">
      <XStack
        ref={impressionRef}
        testID="prime-gift-dashboard-entry"
        accessibilityRole="button"
        focusable
        width="100%"
        minHeight={44}
        bg="$bgSubdued"
        borderWidth={1}
        borderColor="$neutral3"
        borderRadius="$4"
        borderCurve="continuous"
        p="$4"
        alignItems="center"
        gap="$3"
        onPress={openIntro}
        hoverStyle={{ bg: '$bgHover' }}
        pressStyle={{ bg: '$bgActive' }}
      >
        <YStack flex={1} minWidth={0} gap="$1">
          <SizableText size="$bodySm" color="$textSubdued">
            {PRIME_GIFT_DASHBOARD_ENTRY_COPY.eyebrow}
          </SizableText>
          <SizableText size="$headingSm">
            {dashboardEntryTitle(claimable, intl)}
          </SizableText>
          <XStack mt="$3" alignItems="center" gap="$1" flexShrink={0}>
            <SizableText size="$bodySmMedium" color="$textInteractive">
              {PRIME_GIFT_DASHBOARD_ENTRY_COPY.learnMore}
            </SizableText>
            <Icon name="ArrowRightOutline" size="$4" color="$textInteractive" />
          </XStack>
        </YStack>
        <Image
          width={96}
          height={72}
          flexShrink={0}
          contentFit="contain"
          source={HwWalletAvatarImages[EDeviceType.Pro2]}
        />
      </XStack>
    </XStack>
  );
}
