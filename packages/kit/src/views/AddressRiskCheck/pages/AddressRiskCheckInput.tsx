import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Button,
  Icon,
  Page,
  ScrollView,
  SizableText,
  Stack,
  TextArea,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { useClipboard } from '@onekeyhq/components/src/hooks/useClipboard';
import HeaderIconButton from '@onekeyhq/components/src/layouts/Navigation/Header/HeaderIconButton';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { NetworkAvatar } from '@onekeyhq/kit/src/components/NetworkAvatar';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { useDebounce } from '@onekeyhq/kit/src/hooks/useDebounce';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import {
  EModalAddressRiskCheckRoutes,
  type IModalAddressRiskCheckParamList,
} from '@onekeyhq/shared/src/routes/addressRiskCheck';
import type { IAddressRiskCheckRecentItem } from '@onekeyhq/shared/types/addressRiskCheck';

import useConfigurableChainSelector from '../../ChainSelector/hooks/useChainSelector';
import { RecentCheckItem } from '../components/RecentCheckItem';
import { useCheckAddressRisk } from '../hooks/useCheckAddressRisk';
import { useRecentChecks } from '../hooks/useRecentChecks';
import { ARC_TEXTS } from '../texts';

import type { RouteProp } from '@react-navigation/core';

function AddressRiskCheckInput() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const openChainSelector = useConfigurableChainSelector();
  const { getClipboard } = useClipboard();
  const { isChecking, checkRisk } = useCheckAddressRisk();
  const { items: recentChecks, networkNameMap } = useRecentChecks({ limit: 5 });

  const route =
    useRoute<
      RouteProp<
        IModalAddressRiskCheckParamList,
        EModalAddressRiskCheckRoutes.AddressRiskCheckInput
      >
    >();
  const activeNetworkId = route.params?.networkId;

  const [selectedNetwork, setSelectedNetwork] = useState<
    { id: string; name: string } | undefined
  >();
  const [address, setAddress] = useState('');

  const networkId = selectedNetwork?.id;
  const trimmedAddress = address.trim();
  const debouncedAddress = useDebounce(trimmedAddress, 400);

  const { result: supportedNetworks } = usePromiseResult(
    () => backgroundApiProxy.serviceAddressRiskCheck.apiGetSupportedNetworks(),
    [],
    { initResult: [] },
  );

  const supportedNetworkIds = useMemo(
    () => supportedNetworks.map((n) => n.networkId),
    [supportedNetworks],
  );

  // Real-time, debounced address validation against the selected network.
  const { result: validateStatus, isLoading: isValidating } = usePromiseResult(
    async () => {
      if (!networkId || !debouncedAddress) {
        return 'idle' as const;
      }
      return backgroundApiProxy.serviceValidator.validateAddress({
        networkId,
        address: debouncedAddress,
      });
    },
    [networkId, debouncedAddress],
    { initResult: 'idle' as const, watchLoading: true },
  );

  // Pending while the debounce hasn't caught up with the latest input.
  const isPendingValidation = trimmedAddress !== debouncedAddress;
  // Only surface the error once validation has settled, so it doesn't flash a
  // stale "invalid" while the user is still editing.
  const isAddressInvalid =
    Boolean(trimmedAddress) &&
    !isPendingValidation &&
    !isValidating &&
    validateStatus === 'invalid';
  const canCheck =
    Boolean(networkId) &&
    Boolean(trimmedAddress) &&
    !isPendingValidation &&
    !isValidating &&
    (validateStatus === 'valid' || validateStatus === 'unknown');

  // Pre-select the active network once, if it is supported.
  const didPreselectRef = useRef(false);
  useEffect(() => {
    if (
      didPreselectRef.current ||
      !activeNetworkId ||
      !supportedNetworks.length
    ) {
      return;
    }
    const matched = supportedNetworks.find(
      (n) => n.networkId === activeNetworkId,
    );
    if (matched) {
      didPreselectRef.current = true;
      setSelectedNetwork({ id: matched.networkId, name: matched.networkName });
    }
  }, [activeNetworkId, supportedNetworks]);

  const handleSelectNetwork = useCallback(() => {
    openChainSelector({
      networkIds: supportedNetworkIds.length ? supportedNetworkIds : undefined,
      // Only group networks once the list grows beyond 10; a short list reads
      // better as a flat list.
      grouped: supportedNetworkIds.length > 10,
      defaultNetworkId: selectedNetwork?.id,
      onSelect: (network) => {
        setSelectedNetwork({ id: network.id, name: network.name });
      },
    });
  }, [openChainSelector, supportedNetworkIds, selectedNetwork?.id]);

  const handlePaste = useCallback(async () => {
    const text = await getClipboard();
    if (text) {
      setAddress(text);
    }
  }, [getClipboard]);

  const handleChangeAddress = useCallback((text: string) => {
    setAddress(text);
  }, []);

  const handleOpenHistory = useCallback(() => {
    navigation.push(EModalAddressRiskCheckRoutes.AddressRiskCheckHistory);
  }, [navigation]);

  const handleRecentPress = useCallback(
    (item: IAddressRiskCheckRecentItem) => {
      void checkRisk({ networkId: item.networkId, address: item.address });
    },
    [checkRisk],
  );

  const handleCheck = useCallback(() => {
    if (!networkId || !canCheck) {
      return;
    }
    void checkRisk({ networkId, address: trimmedAddress });
  }, [networkId, canCheck, trimmedAddress, checkRisk]);

  const headerRight = useCallback(
    () => (
      <HeaderIconButton
        icon="ClockTimeHistoryOutline"
        onPress={handleOpenHistory}
      />
    ),
    [handleOpenHistory],
  );

  return (
    <Page>
      <Page.Header title={ARC_TEXTS.title} headerRight={headerRight} />
      <Page.Body>
        <ScrollView>
          <YStack px="$5" py="$4" gap="$5">
            <SizableText size="$bodyMd" color="$textSubdued">
              {ARC_TEXTS.intro}
            </SizableText>

            <YStack gap="$1.5">
              <SizableText size="$bodyMdMedium">
                {intl.formatMessage({ id: ETranslations.global_network })}
              </SizableText>
              <XStack
                role="button"
                alignItems="center"
                minHeight={46}
                borderWidth={1}
                borderColor="$borderStrong"
                borderRadius="$3"
                overflow="hidden"
                hoverStyle={{ bg: '$bgHover' }}
                pressStyle={{ bg: '$bgActive' }}
                onPress={handleSelectNetwork}
              >
                <Stack pl="$3">
                  {selectedNetwork ? (
                    <NetworkAvatar networkId={selectedNetwork.id} size="$7" />
                  ) : (
                    <Icon name="GlobusOutline" size="$7" color="$iconSubdued" />
                  )}
                </Stack>
                <SizableText
                  flex={1}
                  px="$3.5"
                  py="$2.5"
                  size="$bodyLg"
                  color={selectedNetwork ? '$text' : '$textSubdued'}
                  numberOfLines={1}
                >
                  {selectedNetwork
                    ? selectedNetwork.name
                    : ARC_TEXTS.selectNetwork}
                </SizableText>
                <Stack px="$2.5">
                  <Icon
                    name="ChevronGrabberVerOutline"
                    size="$6"
                    color="$iconSubdued"
                  />
                </Stack>
              </XStack>
            </YStack>

            <YStack gap="$1.5">
              <SizableText size="$bodyMdMedium">
                {intl.formatMessage({ id: ETranslations.global_address })}
              </SizableText>
              <Stack>
                <TextArea
                  testID="address-risk-check-address-input"
                  value={address}
                  onChangeText={handleChangeAddress}
                  placeholder={ARC_TEXTS.enterAddress}
                  error={isAddressInvalid}
                  numberOfLines={3}
                  pb="$12"
                />
                <Button
                  testID="address-risk-check-paste"
                  position="absolute"
                  bottom="$3"
                  right="$3"
                  size="small"
                  variant="secondary"
                  icon="Copy3Outline"
                  onPress={handlePaste}
                >
                  {intl.formatMessage({ id: ETranslations.menu_paste })}
                </Button>
              </Stack>
              {isAddressInvalid ? (
                <SizableText size="$bodyMd" color="$textCritical">
                  {ARC_TEXTS.invalidAddress}
                </SizableText>
              ) : null}
            </YStack>
          </YStack>

          {recentChecks.length ? (
            <YStack pb="$4">
              <XStack px="$5" py="$2" ai="center" jc="space-between">
                <SizableText size="$headingSm" color="$textSubdued">
                  {ARC_TEXTS.recentChecks}
                </SizableText>
                <SizableText
                  size="$bodyMdMedium"
                  color="$textSubdued"
                  cursor="pointer"
                  onPress={handleOpenHistory}
                >
                  {intl.formatMessage({ id: ETranslations.global_history })}
                </SizableText>
              </XStack>
              {recentChecks.map((item) => (
                <RecentCheckItem
                  key={`${item.networkId}_${item.address}`}
                  item={item}
                  networkName={networkNameMap[item.networkId]}
                  onPress={handleRecentPress}
                />
              ))}
            </YStack>
          ) : null}
        </ScrollView>
      </Page.Body>
      <Page.Footer
        onConfirmText={ARC_TEXTS.checkRisk}
        confirmButtonProps={{ loading: isChecking, disabled: !canCheck }}
        onConfirm={handleCheck}
      />
    </Page>
  );
}

export default AddressRiskCheckInput;
