import { useCallback, useEffect } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Alert,
  Icon,
  Page,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { AccountAvatar } from '@onekeyhq/kit/src/components/AccountAvatar';
import { AccountSelectorProviderMirror } from '@onekeyhq/kit/src/components/AccountSelector';
import { useAccountSelectorTrigger } from '@onekeyhq/kit/src/components/AccountSelector/hooks/useAccountSelectorTrigger';
import { NetworkAvatar } from '@onekeyhq/kit/src/components/NetworkAvatar';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { useAccountSelectorActions } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';
import { getNetworkIdsMap } from '@onekeyhq/shared/src/config/networkIds';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalReferFriendsRoutes } from '@onekeyhq/shared/src/routes';
import type { IBtcRewardCodeInfoParam } from '@onekeyhq/shared/src/routes';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import type { RouteProp } from '@react-navigation/core';

type IRouteParams = RouteProp<
  {
    BtcRewardSelectAddress: {
      codeInfo: IBtcRewardCodeInfoParam;
      shopifyOrderNumber: string;
      displayTitle: string;
      quotaRemaining?: number;
    };
  },
  'BtcRewardSelectAddress'
>;

const baseNetworkId = getNetworkIdsMap().base;

function SelectAddressContent() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const route = useRoute<IRouteParams>();
  const { codeInfo, shopifyOrderNumber, displayTitle, quotaRemaining } =
    route.params;

  const { activeAccount, showAccountSelector } = useAccountSelectorTrigger({
    num: 0,
    linkNetworkId: baseNetworkId,
  });
  const actions = useAccountSelectorActions();

  useEffect(() => {
    void actions.current.syncFromScene({
      from: {
        sceneName: EAccountSelectorSceneName.home,
        sceneUrl: '',
        sceneNum: 0,
      },
      num: 0,
    });
  }, [actions]);

  const account = activeAccount?.account;
  const wallet = activeAccount?.wallet;
  const indexedAccount = activeAccount?.indexedAccount;
  const dbAccount = activeAccount?.dbAccount;
  const walletAddress = account?.address;

  const handleNext = useCallback(() => {
    if (!walletAddress) return;
    navigation.push(EModalReferFriendsRoutes.BtcRewardConfirm, {
      codeInfo,
      shopifyOrderNumber,
      displayTitle,
      walletAddress,
    });
  }, [navigation, walletAddress, codeInfo, shopifyOrderNumber, displayTitle]);

  const renderSelectedCard = () => (
    <XStack
      role="button"
      onPress={showAccountSelector}
      alignItems="center"
      gap="$3"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderSubdued"
      p="$3"
      hoverStyle={{ bg: '$bgHover' }}
      pressStyle={{ bg: '$bgActive' }}
      userSelect="none"
    >
      <AccountAvatar
        size="small"
        indexedAccount={indexedAccount}
        account={account}
        dbAccount={dbAccount}
        wallet={wallet}
      />
      <YStack flex={1} gap="$0.5">
        <SizableText size="$bodyMdMedium" numberOfLines={1}>
          {wallet?.name
            ? `${wallet.name} / ${account?.name ?? ''}`
            : (account?.name ?? '')}
        </SizableText>
        {walletAddress ? (
          <XStack alignItems="center" gap="$1.5">
            <NetworkAvatar networkId={baseNetworkId} size="$4" />
            <SizableText size="$bodySm" color="$textSubdued" numberOfLines={1}>
              {accountUtils.shortenAddress({ address: walletAddress })}
            </SizableText>
          </XStack>
        ) : null}
      </YStack>
      <Icon name="ChevronDownSmallOutline" size="$5" color="$iconSubdued" />
    </XStack>
  );

  const renderPlaceholderCard = () => (
    <XStack
      role="button"
      onPress={showAccountSelector}
      alignItems="center"
      gap="$3"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderSubdued"
      borderStyle="dashed"
      p="$3"
      hoverStyle={{ bg: '$bgHover' }}
      pressStyle={{ bg: '$bgActive' }}
      userSelect="none"
    >
      <Stack
        bg="$bgSubdued"
        borderRadius="$full"
        p="$2"
        alignItems="center"
        justifyContent="center"
      >
        <Icon name="WalletOutline" size="$5" color="$iconSubdued" />
      </Stack>
      <SizableText flex={1} size="$bodyMdMedium" color="$textSubdued">
        {intl.formatMessage({ id: ETranslations.global_select_wallet })}
      </SizableText>
      <Icon name="ChevronDownSmallOutline" size="$5" color="$iconSubdued" />
    </XStack>
  );

  const hasSelection = Boolean(account);

  return (
    <Page scrollEnabled>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.redemption_btc_select_address_title,
        })}
      />
      <Page.Body px="$5" py="$4">
        <YStack gap="$4">
          {hasSelection ? renderSelectedCard() : renderPlaceholderCard()}

          <Alert
            type="warning"
            title={intl.formatMessage({
              id: ETranslations.redemption_btc_select_address_alert_title,
            })}
            description={intl.formatMessage({
              id: ETranslations.redemption_btc_select_address_alert_desc,
            })}
          />
        </YStack>
      </Page.Body>

      <Page.Footer>
        <Page.FooterActions
          onConfirm={handleNext}
          onConfirmText={intl.formatMessage({ id: ETranslations.global_next })}
          confirmButtonProps={{ disabled: !walletAddress }}
        >
          {quotaRemaining !== undefined ? (
            <SizableText size="$bodySm" color="$textSubdued">
              {intl.formatMessage(
                {
                  id: ETranslations.redemption_btc_verify_order_quota_remaining_desc,
                },
                { count: quotaRemaining },
              )}
            </SizableText>
          ) : null}
        </Page.FooterActions>
      </Page.Footer>
    </Page>
  );
}

export default function SelectAddressPage() {
  return (
    <AccountSelectorProviderMirror
      config={{
        sceneName: EAccountSelectorSceneName.addressInput,
        sceneUrl: '',
      }}
      enabledNum={[0]}
      availableNetworksMap={{
        0: {
          networkIds: [baseNetworkId],
          defaultNetworkId: baseNetworkId,
        },
      }}
    >
      <SelectAddressContent />
    </AccountSelectorProviderMirror>
  );
}
