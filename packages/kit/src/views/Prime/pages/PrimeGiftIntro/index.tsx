import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import {
  Button,
  Icon,
  NavCloseButton,
  Page,
  SizableText,
  Spinner,
  YStack,
  useThemeName,
} from '@onekeyhq/components';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EPrimeGiftPages } from '@onekeyhq/shared/src/routes/prime';
import deviceUtils from '@onekeyhq/shared/src/utils/deviceUtils';

import { openBenefits } from '../../components/PrimeGiftViews';
import { usePrimeGiftClaimableDevices } from '../../hooks/usePrimeGiftClaimableDevices';

import type { IPrimeGiftClaimableDevice } from '../../hooks/primeGiftClaimableDevices';

const PRIME_GIFT_INTRO_COPY = {
  title: 'Prime comes with your OneKey Pro 2',
  description:
    'Each OneKey Pro 2 includes Prime. Claim it here if you missed the prompt during setup.',
  steps: [
    {
      title: 'Sign in to OneKey ID',
      description: 'Prime is added to the account you sign in with.',
    },
    {
      title: 'Connect and verify your Pro 2',
      description: 'Connect the device when the claim flow asks you to.',
    },
    {
      title: 'Receive your membership',
      description: 'The included Prime is claimed once for that device.',
    },
  ],
  claimNow: 'Claim now',
  allClaimedTitle: 'All claimed',
  allClaimedDescription:
    'Every Pro 2 in device management has already claimed its included Prime.',
  close: 'Close',
} as const;

function PrimeGiftIntroSteps() {
  return (
    <YStack gap="$4">
      {PRIME_GIFT_INTRO_COPY.steps.map((step, index) => (
        <YStack key={step.title} gap="$1">
          <SizableText size="$bodyLgMedium">
            {`${index + 1}. ${step.title}`}
          </SizableText>
          <SizableText size="$bodyMd" color="$textSubdued">
            {step.description}
          </SizableText>
        </YStack>
      ))}
    </YStack>
  );
}

function PrimeGiftIntroContent({
  onOpenBenefits,
}: {
  onOpenBenefits: () => void;
}) {
  const intl = useIntl();
  const icon =
    useThemeName() === 'light'
      ? 'OnekeyPrimeLightColored'
      : 'OnekeyPrimeDarkColored';
  return (
    <YStack px="$5" pb="$5" gap="$5" testID="prime-gift-intro-content">
      <YStack alignItems="center" gap="$2" pt="$2">
        <Icon name={icon} size="$12" />
        <SizableText size="$heading2xl" textAlign="center">
          {PRIME_GIFT_INTRO_COPY.title}
        </SizableText>
        <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
          {PRIME_GIFT_INTRO_COPY.description}
        </SizableText>
        <Button
          variant="tertiary"
          size="small"
          minHeight={44}
          iconAfter="ChevronRightSmallOutline"
          testID="prime-gift-intro-benefits"
          onPress={onOpenBenefits}
        >
          {intl.formatMessage({
            id: ETranslations.prime_gift_benefits__action,
          })}
        </Button>
      </YStack>
      <PrimeGiftIntroSteps />
    </YStack>
  );
}

function PrimeGiftIntroEmpty({ onClose }: { onClose: () => void }) {
  return (
    <YStack
      px="$5"
      py="$8"
      gap="$3"
      alignItems="center"
      testID="prime-gift-intro-empty"
    >
      <SizableText size="$headingLg" textAlign="center">
        {PRIME_GIFT_INTRO_COPY.allClaimedTitle}
      </SizableText>
      <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
        {PRIME_GIFT_INTRO_COPY.allClaimedDescription}
      </SizableText>
      <Button mt="$3" testID="prime-gift-intro-close" onPress={onClose}>
        {PRIME_GIFT_INTRO_COPY.close}
      </Button>
    </YStack>
  );
}

function openClaim(
  navigation: ReturnType<typeof useAppNavigation>,
  devices: IPrimeGiftClaimableDevice[],
) {
  if (devices.length === 1) {
    const item = devices[0];
    navigation.push(EPrimeGiftPages.PrimeGift, {
      device: deviceUtils.dbDeviceToSearchDevice(item.device),
      serialNo: item.serialNo,
      source: 'primeDashboard',
    });
    return;
  }
  navigation.push(EPrimeGiftPages.PrimeGiftSelectDevice);
}

export default function PrimeGiftIntroPage() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const { devices } = usePrimeGiftClaimableDevices();
  const close = useCallback(() => {
    navigation.popStack();
  }, [navigation]);
  const renderHeaderLeft = useCallback(
    () => <NavCloseButton onPress={close} />,
    [close],
  );
  const claim = useCallback(() => {
    if (!devices?.length) return;
    openClaim(navigation, devices);
  }, [devices, navigation]);
  const showBenefits = useCallback(() => {
    openBenefits(intl);
  }, [intl]);
  let body = <Spinner py="$10" testID="prime-gift-intro-loading" />;
  if (devices?.length) {
    body = <PrimeGiftIntroContent onOpenBenefits={showBenefits} />;
  } else if (devices) {
    body = <PrimeGiftIntroEmpty onClose={close} />;
  }
  return (
    <Page backgroundColor="$bgApp">
      <Page.Header headerTitle="" headerLeft={renderHeaderLeft} />
      <Page.Body>{body}</Page.Body>
      {devices?.length ? (
        <Page.Footer>
          <Page.FooterActions
            onConfirm={claim}
            onConfirmText={PRIME_GIFT_INTRO_COPY.claimNow}
            confirmButtonProps={{ testID: 'prime-gift-intro-claim' }}
          />
        </Page.Footer>
      ) : null}
    </Page>
  );
}
