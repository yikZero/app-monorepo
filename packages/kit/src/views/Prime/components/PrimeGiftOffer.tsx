import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { useFocusEffect } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  HeightTransition,
  Icon,
  SizableText,
  XStack,
  YStack,
  useThemeName,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import type { IDBDevice } from '@onekeyhq/kit-bg/src/dbs/local/types';
import { usePrimeGiftEligibilityPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms/prime';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import {
  EPrimeGiftPages,
  type IPrimeGiftParamList,
} from '@onekeyhq/shared/src/routes/prime';
import deviceUtils from '@onekeyhq/shared/src/utils/deviceUtils';
import type { IPrimeGiftEligibility } from '@onekeyhq/shared/types/prime/primeGiftTypes';

import { getPrimeGiftDurationText } from '../hooks/primeGiftDuration';
import {
  type IPrimeGiftOfferImpressionHost,
  usePrimeGiftOfferImpression,
} from '../hooks/usePrimeGiftOfferImpression';

const fullWidthStyle = {
  width: '100%',
} as const;

const deviceDetailsFrameProps = {
  w: '100%' as const,
};

const onboardingFrameProps = {
  w: '100%' as const,
  $gtMd: { w: 400 },
};

type IPrimeGiftOfferSource = 'onboarding' | 'deviceDetails';

type IImpressionRef = Dispatch<SetStateAction<IPrimeGiftOfferImpressionHost>>;

function PrimeGiftOfferCard({
  device,
  eligibility,
  impressionRef,
  onboardingRouteKey,
  serialNo,
  source,
}: {
  device: IDBDevice;
  eligibility: IPrimeGiftEligibility;
  impressionRef: IImpressionRef;
  onboardingRouteKey?: string;
  serialNo: string;
  source: IPrimeGiftOfferSource;
}) {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const theme = useThemeName();
  const onPress = useCallback(() => {
    defaultLogger.prime.subscription.primeGiftOfferClick({ source });
    const params: IPrimeGiftParamList[EPrimeGiftPages.PrimeGift] = {
      device: deviceUtils.dbDeviceToSearchDevice(device),
      serialNo,
      source,
      onboardingRouteKey,
    };
    // Android onboarding stays on the dark stack so the first native
    // frame and close/pop never expose the light root-modal surface.
    if (platformEnv.isNativeAndroid && source === 'onboarding') {
      navigation.push(EPrimeGiftPages.PrimeGift, params);
      return;
    }
    navigation.pushModal(EModalRoutes.PrimeGiftModal, {
      screen: EPrimeGiftPages.PrimeGift,
      params,
    });
  }, [device, navigation, onboardingRouteKey, serialNo, source]);

  return (
    <XStack
      ref={impressionRef}
      testID={`prime-gift-offer-${source}`}
      accessibilityRole="button"
      focusable
      alignItems="center"
      gap="$3"
      minHeight={88}
      w="100%"
      px="$4"
      py="$4"
      bg="$bgSubdued"
      borderRadius="$4"
      hoverStyle={{ bg: '$bgHover' }}
      pressStyle={{ bg: '$bgActive' }}
      onPress={onPress}
    >
      <Icon
        name={
          theme === 'light'
            ? 'OnekeyPrimeLightColored'
            : 'OnekeyPrimeDarkColored'
        }
        size="$6"
      />
      <YStack flex={1} minWidth={0} gap="$0.5">
        <SizableText size="$bodyLgMedium">
          {intl.formatMessage(
            { id: ETranslations.prime_gift_claim_duration__action },
            { duration: getPrimeGiftDurationText(eligibility, intl) },
          )}
        </SizableText>
        <SizableText size="$bodyMd" color="$textSubdued">
          {intl.formatMessage({
            id:
              source === 'onboarding'
                ? ETranslations.prime_gift_later__desc
                : ETranslations.prime_gift_device_once__desc,
          })}
        </SizableText>
      </YStack>
      <Icon
        name="ChevronRightSmallOutline"
        size="$4"
        color="$iconSubdued"
        flexShrink={0}
      />
    </XStack>
  );
}

export function PrimeGiftOffer({
  device,
  source,
  onboardingRouteKey,
  skipInitialRefresh = false,
}: {
  device: IDBDevice;
  source: IPrimeGiftOfferSource;
  onboardingRouteKey?: string;
  skipInitialRefresh?: boolean;
}) {
  const serialNo = deviceUtils.getDeviceSerialNoFromDbDevice(device);
  const [eligibilityBySerialNo] = usePrimeGiftEligibilityPersistAtom();
  const eligibility = serialNo ? eligibilityBySerialNo[serialNo] : undefined;
  const skipInitialRefreshRef = useRef(skipInitialRefresh);
  const refresh = useCallback(() => {
    if (!serialNo) {
      return;
    }
    void backgroundApiProxy.servicePrime
      .apiGetPrimeGiftEligibility({ serialNo })
      .catch(() => undefined);
  }, [serialNo]);
  useFocusEffect(
    useCallback(() => {
      if (skipInitialRefreshRef.current) {
        skipInitialRefreshRef.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );
  useEffect(() => {
    const onRedeemed = (event: { serialNo: string }) => {
      if (event.serialNo === serialNo) {
        refresh();
      }
    };
    appEventBus.on(EAppEventBusNames.PrimeGiftRedeemed, onRedeemed);
    return () => {
      appEventBus.off(EAppEventBusNames.PrimeGiftRedeemed, onRedeemed);
    };
  }, [serialNo, refresh]);
  const isEligible = Boolean(
    serialNo && eligibility?.eligible && eligibility.hasUnclaimedGift,
  );
  // First frame for this serial. Onboarding always grows into an already
  // visible page. Device details grows only when eligibility arrives later,
  // so a cached offer does not push the sections below on every open.
  const appearanceRef = useRef<{
    serialNo: string | undefined;
    eligible: boolean;
  } | null>(null);
  let appearance = appearanceRef.current;
  if (!appearance || appearance.serialNo !== serialNo) {
    appearance = { serialNo, eligible: isEligible };
    appearanceRef.current = appearance;
  }
  const shouldAnimateEnter = source === 'onboarding' || !appearance.eligible;
  const impressionRef = usePrimeGiftOfferImpression({
    enabled: isEligible,
    serialNo,
    source,
  });
  if (!serialNo || !eligibility?.eligible || !eligibility.hasUnclaimedGift) {
    return null;
  }
  const card = (
    <PrimeGiftOfferCard
      device={device}
      eligibility={eligibility}
      impressionRef={impressionRef}
      onboardingRouteKey={onboardingRouteKey}
      serialNo={serialNo}
      source={source}
    />
  );
  const frameProps =
    source === 'onboarding' ? onboardingFrameProps : deviceDetailsFrameProps;
  if (shouldAnimateEnter) {
    return (
      <YStack {...frameProps}>
        <HeightTransition style={fullWidthStyle}>
          <YStack pt="$8" w="100%">
            {card}
          </YStack>
        </HeightTransition>
      </YStack>
    );
  }
  return (
    <YStack pt="$8" {...frameProps}>
      {card}
    </YStack>
  );
}
