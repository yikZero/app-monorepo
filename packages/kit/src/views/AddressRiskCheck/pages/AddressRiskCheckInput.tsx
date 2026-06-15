import { useCallback, useMemo, useState } from 'react';

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
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalAddressRiskCheckRoutes } from '@onekeyhq/shared/src/routes/addressRiskCheck';

import useConfigurableChainSelector from '../../ChainSelector/hooks/useChainSelector';
import { useCheckAddressRisk } from '../hooks/useCheckAddressRisk';
import { ARC_TEXTS } from '../texts';

function AddressRiskCheckInput() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const openChainSelector = useConfigurableChainSelector();
  const { getClipboard } = useClipboard();
  const { isChecking, checkRisk } = useCheckAddressRisk();

  const [selectedNetwork, setSelectedNetwork] = useState<
    { id: string; name: string } | undefined
  >();
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState('');

  const { result: supportedNetworks } = usePromiseResult(
    () => backgroundApiProxy.serviceAddressRiskCheck.apiGetSupportedNetworks(),
    [],
    { initResult: [] },
  );

  const supportedNetworkIds = useMemo(
    () => supportedNetworks.map((n) => n.networkId),
    [supportedNetworks],
  );

  const handleSelectNetwork = useCallback(() => {
    openChainSelector({
      networkIds: supportedNetworkIds.length ? supportedNetworkIds : undefined,
      defaultNetworkId: selectedNetwork?.id,
      onSelect: (network) => {
        setSelectedNetwork({ id: network.id, name: network.name });
        setAddressError('');
      },
    });
  }, [openChainSelector, supportedNetworkIds, selectedNetwork?.id]);

  const handlePaste = useCallback(async () => {
    const text = await getClipboard();
    if (text) {
      setAddress(text);
      setAddressError('');
    }
  }, [getClipboard]);

  const handleChangeAddress = useCallback((text: string) => {
    setAddress(text);
    setAddressError('');
  }, []);

  const handleOpenHistory = useCallback(() => {
    navigation.push(EModalAddressRiskCheckRoutes.AddressRiskCheckHistory);
  }, [navigation]);

  const handleCheck = useCallback(async () => {
    const networkId = selectedNetwork?.id;
    const trimmed = address.trim();
    if (!networkId || !trimmed) {
      setAddressError(ARC_TEXTS.invalidAddress);
      return;
    }
    const status = await backgroundApiProxy.serviceValidator.validateAddress({
      networkId,
      address: trimmed,
    });
    if (status === 'invalid') {
      setAddressError(ARC_TEXTS.invalidAddress);
      return;
    }
    await checkRisk({ networkId, address: trimmed });
  }, [selectedNetwork?.id, address, checkRisk]);

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
                gap="$2"
                px="$3"
                py="$3"
                borderWidth={1}
                borderColor="$borderStrong"
                borderRadius="$3"
                hoverStyle={{ bg: '$bgHover' }}
                pressStyle={{ bg: '$bgActive' }}
                onPress={handleSelectNetwork}
              >
                {selectedNetwork ? (
                  <NetworkAvatar networkId={selectedNetwork.id} size="$6" />
                ) : (
                  <Icon name="GlobusOutline" size="$6" color="$iconSubdued" />
                )}
                <SizableText
                  flex={1}
                  size="$bodyLg"
                  color={selectedNetwork ? '$text' : '$textSubdued'}
                  numberOfLines={1}
                >
                  {selectedNetwork
                    ? selectedNetwork.name
                    : ARC_TEXTS.selectNetwork}
                </SizableText>
                <Icon
                  name="ChevronGrabberVerOutline"
                  size="$5"
                  color="$iconSubdued"
                />
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
                  error={Boolean(addressError)}
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
              {addressError ? (
                <SizableText size="$bodyMd" color="$textCritical">
                  {addressError}
                </SizableText>
              ) : null}
            </YStack>
          </YStack>
        </ScrollView>
      </Page.Body>
      <Page.Footer
        onConfirmText={ARC_TEXTS.checkRisk}
        confirmButtonProps={{ loading: isChecking }}
        onConfirm={handleCheck}
      />
    </Page>
  );
}

export default AddressRiskCheckInput;
