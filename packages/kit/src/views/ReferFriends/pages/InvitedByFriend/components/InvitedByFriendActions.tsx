import { useCallback, useMemo, useRef, useState } from 'react';

import { useIntl } from 'react-intl';
import { StyleSheet } from 'react-native';

import {
  Button,
  Icon,
  Select,
  SizableText,
  Skeleton,
  Stack,
  Toast,
  XStack,
  YStack,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { WalletAvatar } from '@onekeyhq/kit/src/components/WalletAvatar/WalletAvatar';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { useSignatureConfirm } from '@onekeyhq/kit/src/hooks/useSignatureConfirm';
import { useOneKeyWalletDetection } from '@onekeyhq/kit/src/hooks/useWebDapp/useOneKeyWalletDetection';
import { useActiveAccount } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';
import { useBindReferralViaExtension } from '@onekeyhq/kit/src/views/ReferFriends/hooks/useBindReferralViaExtension';
import {
  useFetchWalletsWithBoundStatus,
  useGetReferralCodeWalletInfo,
  useWalletBoundReferralCode,
} from '@onekeyhq/kit/src/views/ReferFriends/hooks/useWalletBoundReferralCode';
import { isBindWindowExpiredError } from '@onekeyhq/kit/src/views/ReferFriends/hooks/useWalletBoundReferralCode/referralBindStatusUtils';
import type { IWalletWithReferralBindStatus } from '@onekeyhq/kit/src/views/ReferFriends/hooks/useWalletBoundReferralCode/useFetchWalletsWithBoundStatus';
import { EXTENSION_STORE_URLS } from '@onekeyhq/shared/src/config/extensionConfig';
import { EOneKeyDeepLinkPath } from '@onekeyhq/shared/src/consts/deeplinkConsts';
import type { OneKeyError } from '@onekeyhq/shared/src/errors';
import { EOneKeyErrorClassNames } from '@onekeyhq/shared/src/errors/types/errorTypes';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { isValidInviteCode } from '@onekeyhq/shared/src/referralCode/installReferrerUtils';
import {
  EAccountManagerStacksRoutes,
  EModalRoutes,
} from '@onekeyhq/shared/src/routes';
import uriUtils from '@onekeyhq/shared/src/utils/uriUtils';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import { ReferFriendsTestIDs } from '../../../testIDs';

interface IInvitedByFriendActionsProps {
  referralCode: string;
  page?: string;
}

function OptionCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Stack
      borderWidth={1}
      borderColor="$borderStrong"
      borderRadius="$3"
      p="$3"
      hoverStyle={{ bg: '$bgHover' }}
      pressStyle={{ bg: '$bgActive' }}
      onPress={onPress}
      cursor="pointer"
    >
      <XStack alignItems="center" gap="$3">
        <Stack
          bg="$bgStrong"
          borderRadius="$2"
          p="$2"
          alignItems="center"
          justifyContent="center"
        >
          <Icon name={icon} size="$5" color="$iconSubdued" />
        </Stack>
        <YStack flex={1} gap="$0.5">
          <SizableText size="$bodyLgMedium">{title}</SizableText>
          <SizableText size="$bodySm" color="$textSubdued">
            {description}
          </SizableText>
        </YStack>
        <Icon name="ChevronRightSmallOutline" size="$5" color="$iconSubdued" />
      </XStack>
    </Stack>
  );
}

function WebWalletOptions({
  referralCode,
  page,
  onBack,
}: {
  referralCode: string;
  page?: string;
  onBack: () => void;
}) {
  const intl = useIntl();

  const handleOpenDesktop = useCallback(() => {
    defaultLogger.referral.page.clickAcceptInviteButton({
      referralCode,
      acceptMethod: 'web_no_extension',
    });
    const deepLinkUrl = uriUtils.buildDeepLinkUrl({
      path: EOneKeyDeepLinkPath.invited_by_friend,
      query: { code: referralCode, page },
    });
    globalThis.location.href = deepLinkUrl;
  }, [referralCode, page]);

  const handleGetExtension = useCallback(() => {
    defaultLogger.referral.page.clickAcceptInviteButton({
      referralCode,
      acceptMethod: 'web_get_extension',
    });
    globalThis.open(EXTENSION_STORE_URLS.chrome, '_blank');
  }, [referralCode]);

  return (
    <YStack bg="$bgApp">
      <YStack gap="$2" w="100%" px="$4" pt="$4" pb="$2">
        <SizableText size="$bodyMdMedium" color="$textSubdued" mb="$1">
          {intl.formatMessage({
            id: ETranslations.referral_choose_how_to_bind,
          })}
        </SizableText>

        <OptionCard
          icon="MonitorOutline"
          title={intl.formatMessage({
            id: ETranslations.referral_desktop_app,
          })}
          description={intl.formatMessage({
            id: ETranslations.referral_open_in_desktop_application,
          })}
          onPress={handleOpenDesktop}
        />

        <OptionCard
          icon="DownloadOutline"
          title={intl.formatMessage({
            id: ETranslations.referral_get_browser_extension,
          })}
          description={intl.formatMessage({
            id: ETranslations.referral_install_from_chrome_web_store,
          })}
          onPress={handleGetExtension}
        />
      </YStack>

      <XStack px="$4" py="$4">
        <Button
          testID={ReferFriendsTestIDs.webOptionsCancelBtn}
          variant="secondary"
          w="100%"
          $md={{ size: 'large' }}
          onPress={onBack}
        >
          {intl.formatMessage({ id: ETranslations.global_cancel })}
        </Button>
      </XStack>
    </YStack>
  );
}

function ActionsFooter({ children }: { children: React.ReactNode }) {
  return (
    <YStack gap="$3" w="100%" px="$4" py="$4" bg="$bgApp">
      {children}
    </YStack>
  );
}

function PrimaryButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      testID={ReferFriendsTestIDs.inviteFooterBtn}
      variant="primary"
      w="100%"
      $md={{ size: 'large' }}
      $gtMd={{ alignSelf: 'flex-end', w: 'auto', minWidth: 160 }}
      {...props}
    />
  );
}

function WebInviteActions({
  referralCode,
  page,
}: IInvitedByFriendActionsProps) {
  const navigation = useAppNavigation();
  const [showWebOptions, setShowWebOptions] = useState(false);
  const { isOneKeyInstalled } = useOneKeyWalletDetection();
  const { bindViaExtension, isBinding } = useBindReferralViaExtension({
    referralCode,
    onSuccess: () => navigation.pop(),
  });

  const handleApply = useCallback(() => {
    if (isOneKeyInstalled) {
      defaultLogger.referral.page.clickAcceptInviteButton({
        referralCode,
        acceptMethod: 'web_extension',
      });
      void bindViaExtension();
      return;
    }
    // No extension → show options (desktop app / install extension)
    setShowWebOptions(true);
  }, [bindViaExtension, isOneKeyInstalled, referralCode]);

  if (showWebOptions) {
    return (
      <WebWalletOptions
        referralCode={referralCode}
        page={page}
        onBack={() => setShowWebOptions(false)}
      />
    );
  }

  return (
    <ActionsFooter>
      <PrimaryButton
        testID={ReferFriendsTestIDs.acceptBtn}
        onPress={handleApply}
        loading={isBinding}
        disabled={isBinding}
      >
        Apply
      </PrimaryButton>
    </ActionsFooter>
  );
}

function getWalletStatusTag(status: IWalletWithReferralBindStatus['status']) {
  switch (status) {
    case 'bound':
      return 'Code applied';
    case 'expired':
      return 'Over 14 days old';
    case 'unknown':
      return 'Couldn’t load';
    default:
      return undefined;
  }
}

function WalletBindActions({ referralCode }: IInvitedByFriendActionsProps) {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const { activeAccount } = useActiveAccount({ num: 0 });
  const { confirmBindReferralCode } = useWalletBoundReferralCode({
    entry: 'modal',
  });
  const {
    walletsWithStatus,
    isLoading: isLoadingWallets,
    refreshWalletsWithStatus,
  } = useFetchWalletsWithBoundStatus();
  const getReferralCodeWalletInfo = useGetReferralCodeWalletInfo();

  const [pickedWalletId, setPickedWalletId] = useState<string | undefined>();
  const [isBinding, setIsBinding] = useState(false);
  // State alone lets two taps in one frame both start a bind.
  const isBindingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const bindableWallets = useMemo(
    () => walletsWithStatus?.filter((item) => item.status === 'bindable') ?? [],
    [walletsWithStatus],
  );

  // Start on the active wallet if it can still bind, otherwise the first that can.
  const selectedWallet = useMemo(() => {
    const preferredId = pickedWalletId ?? activeAccount?.wallet?.id;
    return (
      bindableWallets.find((item) => item.wallet.id === preferredId) ??
      bindableWallets[0]
    )?.wallet;
  }, [activeAccount?.wallet?.id, bindableWallets, pickedWalletId]);

  const { result: resolvedWalletInfo } = usePromiseResult(
    async () => getReferralCodeWalletInfo(selectedWallet?.id),
    [getReferralCodeWalletInfo, selectedWallet?.id],
  );
  // The lookup is async: right after a wallet switch it still holds the
  // previous wallet, and binding with it would sign for the wrong wallet.
  const walletInfo =
    resolvedWalletInfo && resolvedWalletInfo.walletId === selectedWallet?.id
      ? resolvedWalletInfo
      : undefined;
  const { navigationToMessageConfirmAsync } = useSignatureConfirm({
    accountId: walletInfo?.accountId ?? '',
    networkId: walletInfo?.networkId ?? '',
  });

  const walletItems = useMemo(
    () =>
      (walletsWithStatus ?? []).map((item) => ({
        label: item.wallet.name,
        value: item.wallet.id,
        leading: <WalletAvatar wallet={item.wallet} size="$6" />,
        description: getWalletStatusTag(item.status),
        disabled: item.status !== 'bindable',
      })),
    [walletsWithStatus],
  );

  const handleCreateWallet = useCallback(() => {
    navigation.pushModal(EModalRoutes.AccountManagerStacks, {
      screen: EAccountManagerStacksRoutes.AccountSelectorStack,
      params: {
        num: 0,
        sceneName: EAccountSelectorSceneName.home,
        sceneUrl: '',
        editable: true,
      },
    });
  }, [navigation]);

  const handleApply = useCallback(async () => {
    if (!walletInfo || isBindingRef.current) {
      return;
    }
    isBindingRef.current = true;
    defaultLogger.referral.page.clickAcceptInviteButton({
      referralCode,
      acceptMethod: 'local_app',
    });
    setErrorMessage(undefined);
    setIsBinding(true);
    try {
      await confirmBindReferralCode({
        referralCode,
        walletInfo,
        navigationToMessageConfirmAsync,
        suppressSuccessToast: true,
        // Server rejections render inline below; a no-op preventClose keeps
        // them out of the toast while other failures still toast.
        preventClose: () => {},
      });
      Toast.success({ title: 'Referral code applied' });
      try {
        await backgroundApiProxy.serviceReferralCode.consumeInstallReferralIfBound(
          { referralCode },
        );
      } catch {
        // Worst case the install-referrer invite is offered once more.
      }
      navigation.pop();
    } catch (e) {
      const err = e as OneKeyError<unknown, { messageId?: string }>;
      if (err?.className === EOneKeyErrorClassNames.OneKeyServerApiError) {
        setErrorMessage(
          isBindWindowExpiredError(err)
            ? intl.formatMessage({
                id: ETranslations.referral_not_applicable_desc,
              })
            : err.message,
        );
        // A server rejection may mean the status list is stale (bound
        // elsewhere, or the window closed), so read it again.
        void refreshWalletsWithStatus();
      }
    } finally {
      isBindingRef.current = false;
      setIsBinding(false);
    }
  }, [
    confirmBindReferralCode,
    intl,
    navigation,
    navigationToMessageConfirmAsync,
    referralCode,
    refreshWalletsWithStatus,
    walletInfo,
  ]);

  const isDataReady = !isLoadingWallets && walletsWithStatus !== undefined;

  if (!isDataReady) {
    return (
      <ActionsFooter>
        <Skeleton h="$11" w="100%" borderRadius="$3" />
        <PrimaryButton disabled loading>
          Apply
        </PrimaryButton>
      </ActionsFooter>
    );
  }

  if (walletsWithStatus.length === 0) {
    return (
      <ActionsFooter>
        <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
          {intl.formatMessage({
            id: ETranslations.referral_apply_code_no_wallet,
          })}
        </SizableText>
        <PrimaryButton onPress={handleCreateWallet}>
          {intl.formatMessage({ id: ETranslations.global_create_wallet })}
        </PrimaryButton>
      </ActionsFooter>
    );
  }

  if (!selectedWallet) {
    // No wallet can bind. If any status failed to load, offer a retry
    // instead of claiming none are eligible.
    const hasUnknown = walletsWithStatus.some(
      (item) => item.status === 'unknown',
    );
    return (
      <ActionsFooter>
        <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
          {hasUnknown
            ? 'Couldn’t load wallet status'
            : 'Your wallets are already applied or over 14 days old'}
        </SizableText>
        {hasUnknown ? (
          <PrimaryButton onPress={() => void refreshWalletsWithStatus()}>
            {intl.formatMessage({ id: ETranslations.global_retry })}
          </PrimaryButton>
        ) : (
          <PrimaryButton variant="secondary" onPress={() => navigation.pop()}>
            {intl.formatMessage({ id: ETranslations.global_got_it })}
          </PrimaryButton>
        )}
      </ActionsFooter>
    );
  }

  const canPickWallet = walletsWithStatus.length > 1;
  const walletRow = (
    <XStack
      gap="$2"
      ai="center"
      py="$2.5"
      px="$3"
      bg="$bgSubdued"
      borderRadius="$3"
      borderWidth={StyleSheet.hairlineWidth}
      borderColor="$borderSubdued"
      {...(canPickWallet
        ? {
            hoverStyle: { bg: '$bgHover' },
            pressStyle: { bg: '$bgActive' },
          }
        : null)}
    >
      <SizableText size="$bodyMd" color="$textSubdued" flexShrink={0}>
        Apply to
      </SizableText>
      <XStack gap="$2" ai="center" flex={1} minWidth={0} jc="flex-end">
        <WalletAvatar wallet={selectedWallet} size="$6" />
        <SizableText size="$bodyLgMedium" numberOfLines={1} flexShrink={1}>
          {selectedWallet.name}
        </SizableText>
      </XStack>
      {canPickWallet ? (
        <Icon
          name="ChevronDownSmallOutline"
          color="$iconSubdued"
          flexShrink={0}
        />
      ) : null}
    </XStack>
  );

  return (
    <ActionsFooter>
      <YStack gap="$2">
        {canPickWallet ? (
          <Select
            testID="refer-friends-select"
            title={intl.formatMessage({
              id: ETranslations.global_select_wallet,
            })}
            items={walletItems}
            value={selectedWallet.id}
            disabled={isBinding}
            onChange={(walletId) => {
              if (typeof walletId === 'string') {
                setPickedWalletId(walletId);
                setErrorMessage(undefined);
              }
            }}
            renderTrigger={() => walletRow}
          />
        ) : (
          walletRow
        )}
        <SizableText size="$bodySm" color="$textSubdued" px="$1">
          Can’t be changed after applying
        </SizableText>
        {errorMessage ? (
          <SizableText size="$bodySm" color="$textCritical" px="$1">
            {errorMessage}
          </SizableText>
        ) : null}
      </YStack>
      <PrimaryButton
        testID={ReferFriendsTestIDs.acceptBtn}
        onPress={() => void handleApply()}
        loading={isBinding}
        disabled={isBinding || !walletInfo}
      >
        Apply
      </PrimaryButton>
    </ActionsFooter>
  );
}

function InvalidCodeActions() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  return (
    <ActionsFooter>
      <SizableText size="$bodyMd" color="$textCritical" textAlign="center">
        {intl.formatMessage({ id: ETranslations.referral_invalid_code })}
      </SizableText>
      <PrimaryButton variant="secondary" onPress={() => navigation.pop()}>
        {intl.formatMessage({ id: ETranslations.global_got_it })}
      </PrimaryButton>
    </ActionsFooter>
  );
}

function InvitedByFriendActions(props: IInvitedByFriendActionsProps) {
  // The code arrives from a deep link; refuse anything the bind form would,
  // before asking a wallet to sign for it.
  if (!isValidInviteCode(props.referralCode)) {
    return <InvalidCodeActions />;
  }
  if (platformEnv.isWeb) {
    return <WebInviteActions {...props} />;
  }
  return <WalletBindActions {...props} />;
}

export { InvitedByFriendActions };
