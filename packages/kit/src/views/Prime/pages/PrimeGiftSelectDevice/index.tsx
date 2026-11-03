import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import {
  Button,
  NavBackButton,
  Page,
  SizableText,
  Spinner,
  YStack,
} from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { WalletAvatar } from '@onekeyhq/kit/src/components/WalletAvatar';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { EPrimeGiftPages } from '@onekeyhq/shared/src/routes/prime';
import deviceUtils from '@onekeyhq/shared/src/utils/deviceUtils';

import { getPrimeGiftDurationText } from '../../hooks/primeGiftDuration';
import { usePrimeGiftClaimableDevices } from '../../hooks/usePrimeGiftClaimableDevices';

import type { IPrimeGiftClaimableDevice } from '../../hooks/primeGiftClaimableDevices';
import type { IntlShape } from 'react-intl';

const PRIME_GIFT_SELECT_DEVICE_COPY = {
  title: 'Choose a Pro 2',
  emptyTitle: 'All claimed',
  emptyDescription:
    'Every Pro 2 in device management has already claimed its included Prime.',
  close: 'Close',
  fallbackName: 'OneKey Pro 2',
} as const;

function serialTail(serialNo: string) {
  const tail = serialNo.trim().slice(-4);
  return tail || serialNo;
}

function deviceTitle(item: IPrimeGiftClaimableDevice) {
  return (
    item.wallet.name?.trim() ||
    item.device.name?.trim() ||
    PRIME_GIFT_SELECT_DEVICE_COPY.fallbackName
  );
}

function deviceSubtitle(item: IPrimeGiftClaimableDevice, intl: IntlShape) {
  const serial = `OneKey Pro 2 · SN ••••${serialTail(item.serialNo)}`;
  const duration = getPrimeGiftDurationText(item.eligibility, intl);
  return duration ? `${serial} · ${duration}` : serial;
}

function ClaimableDeviceRow({
  item,
  onPress,
}: {
  item: IPrimeGiftClaimableDevice;
  onPress: (item: IPrimeGiftClaimableDevice) => void;
}) {
  const intl = useIntl();
  const renderAvatar = useCallback(
    () => <WalletAvatar wallet={item.wallet} />,
    [item.wallet],
  );
  return (
    <ListItem
      testID={`prime-gift-select-${item.serialNo}`}
      title={deviceTitle(item)}
      subtitle={deviceSubtitle(item, intl)}
      renderAvatar={renderAvatar}
      drillIn
      onPress={() => {
        onPress(item);
      }}
    />
  );
}

function PrimeGiftSelectEmpty({ onClose }: { onClose: () => void }) {
  return (
    <YStack px="$5" py="$8" gap="$3" alignItems="center">
      <SizableText size="$headingLg" textAlign="center">
        {PRIME_GIFT_SELECT_DEVICE_COPY.emptyTitle}
      </SizableText>
      <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
        {PRIME_GIFT_SELECT_DEVICE_COPY.emptyDescription}
      </SizableText>
      <Button mt="$3" testID="prime-gift-select-close" onPress={onClose}>
        {PRIME_GIFT_SELECT_DEVICE_COPY.close}
      </Button>
    </YStack>
  );
}

export default function PrimeGiftSelectDevicePage() {
  const navigation = useAppNavigation();
  const { devices } = usePrimeGiftClaimableDevices();
  const close = useCallback(() => {
    navigation.popStack();
  }, [navigation]);
  const back = useCallback(() => {
    navigation.pop();
  }, [navigation]);
  const renderHeaderLeft = useCallback(
    () => <NavBackButton onPress={back} />,
    [back],
  );
  const openClaim = useCallback(
    (item: IPrimeGiftClaimableDevice) => {
      navigation.push(EPrimeGiftPages.PrimeGift, {
        device: deviceUtils.dbDeviceToSearchDevice(item.device),
        serialNo: item.serialNo,
        source: 'primeDashboard',
      });
    },
    [navigation],
  );
  let body = <Spinner py="$10" />;
  if (devices?.length) {
    body = (
      <YStack>
        {devices.map((item) => (
          <ClaimableDeviceRow
            key={item.serialNo}
            item={item}
            onPress={openClaim}
          />
        ))}
      </YStack>
    );
  } else if (devices) {
    body = <PrimeGiftSelectEmpty onClose={close} />;
  }
  return (
    <Page backgroundColor="$bgApp">
      <Page.Header
        headerTitle={PRIME_GIFT_SELECT_DEVICE_COPY.title}
        headerLeft={renderHeaderLeft}
      />
      <Page.Body>{body}</Page.Body>
    </Page>
  );
}
