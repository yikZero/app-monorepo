import { useCallback, useMemo, useRef } from 'react';

import { useIntl } from 'react-intl';

import GiftExpandOnDark from '@onekeyhq/kit/assets/animations/gift-expand-on-dark.json';
import GiftExpandOnLight from '@onekeyhq/kit/assets/animations/gift-expand-on-light.json';
import { useOneKeyAuth } from '@onekeyhq/kit/src/components/OneKeyAuth/useOneKeyAuth';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { useShowAddressBook } from '@onekeyhq/kit/src/hooks/useShowAddressBook';
import { useActiveAccount } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector/atoms';
import { useHomeTokenListSnapshot } from '@onekeyhq/kit/src/states/jotai/contexts/tokenList/cells';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  EModalRoutes,
  EModalSettingRoutes,
  ESettingsTabNames,
} from '@onekeyhq/shared/src/routes';
import { EModalAddressRiskCheckRoutes } from '@onekeyhq/shared/src/routes/addressRiskCheck';
import { EModalBulkCopyAddressesRoutes } from '@onekeyhq/shared/src/routes/bulkCopyAddresses';
import { EPrimeFeatures, EPrimePages } from '@onekeyhq/shared/src/routes/prime';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';
import { EPrimeFreeTrialPendingActionType } from '@onekeyhq/shared/types/prime/primeFreeTrialTypes';

import { useReferFriends } from '../../hooks/useReferFriends';
import { useThemeVariant } from '../../hooks/useThemeVariant';
import { canAccessBulkSend } from '../../views/BulkSend/access';
import { useBulkSendModeDialog } from '../../views/BulkSend/hooks/useBulkSendModeDialog';
import { useNavigateToBulkSend } from '../../views/BulkSend/hooks/useNavigateToBulkSend';
import { usePrimeFeatureAccess } from '../../views/Prime/hooks/usePrimeFeatureAccess';
import useScanQrCodeLazy from '../../views/ScanQrCode/hooks/useScanQrCodeLazy';
import { logSettingCategoryOpened } from '../../views/Setting/pages/Tab/settingsAnalytics';

import { ERecentFeatureId } from './recentFeatures/recentFeatureRoutes';
import { recordRecentFeature } from './recentFeatures/recordRecentFeature';

import type { IMoreActionContentGridItemProps } from './types';

export function useMoreActionScan() {
  const {
    activeAccount: { account, network },
  } = useActiveAccount({ num: 0 });
  const { tokens, keys, map } = useHomeTokenListSnapshot();
  const scanQrCode = useScanQrCodeLazy();

  return useCallback(async () => {
    // Scan has no landing route, so it is recorded on press.
    recordRecentFeature(ERecentFeatureId.Scan);
    await scanQrCode.start({
      handlers: scanQrCode.PARSE_HANDLER_NAMES.all,
      autoExecuteParsedAction: true,
      account,
      network,
      tokens: {
        data: tokens,
        keys,
        map,
      },
    });
  }, [scanQrCode, account, network, tokens, keys, map]);
}

type IMoreActionActiveContext = {
  walletId?: string;
  networkId?: string;
  accountId?: string;
  indexedAccountId?: string;
};

function useMoreActionWalletHandlers() {
  const navigation = useAppNavigation();
  const navigateToBulkSend = useNavigateToBulkSend();
  const showBulkSendModeDialog = useBulkSendModeDialog();
  const openSettingsCategory = useCallback(
    (category: ESettingsTabNames) => {
      logSettingCategoryOpened({
        category,
        source: 'moreActions',
      });
      navigation.pushModal(EModalRoutes.SettingModal, {
        screen: EModalSettingRoutes.SettingListSubModal,
        params: {
          name: category,
        },
      });
    },
    [navigation],
  );
  const onPressAddressBook = useShowAddressBook({
    useNewModal: true,
  });
  const handleAddressBook = useCallback(() => {
    void onPressAddressBook(navigation);
  }, [onPressAddressBook, navigation]);

  const { user, isPrimeActive, isPrimeSubscriptionActive } = useOneKeyAuth();
  const isPrimeUser = isPrimeActive && user?.onekeyUserId;
  // Access without free-trial metering (E2E / Prime); free users go through
  // the gate.
  const hasBulkSendAccess = canAccessBulkSend({
    isE2E: platformEnv.isE2E === true,
    isPrimeActive: Boolean(isPrimeSubscriptionActive),
    oneKeyUserId: user?.onekeyUserId,
  });
  const {
    activeAccount: { account, network, wallet, indexedAccount },
  } = useActiveAccount({ num: 0 });
  const { ensureFeatureAccess } = usePrimeFeatureAccess();
  // Latest selection, compared after the gate's async steps so a changed
  // context does not continue the old action. Each entry passes the parts it
  // acts on.
  const activeContextRef = useRef<IMoreActionActiveContext>({});
  activeContextRef.current = {
    walletId: wallet?.id,
    networkId: network?.id,
    accountId: account?.id,
    indexedAccountId: indexedAccount?.id,
  };
  const isSameActiveContext = useCallback(
    (context: IMoreActionActiveContext) => () =>
      (Object.keys(context) as (keyof IMoreActionActiveContext)[]).every(
        (key) => activeContextRef.current[key] === context[key],
      ),
    [],
  );
  const openBulkCopyAddressesModule = useCallback(async () => {
    const networkId = networkUtils.toNetworkIdFallback({
      networkId: network?.id,
      allNetworkFallbackToBtc: true,
    });

    if (!networkId) return;

    const access = await ensureFeatureAccess({
      featureId: EPrimeFeatures.BulkCopyAddresses,
      networkId: network?.id,
      isContextValid: isSameActiveContext({
        walletId: wallet?.id,
        networkId: network?.id,
      }),
      extPopup: {
        mode: 'pendingAction',
        action: {
          type: EPrimeFreeTrialPendingActionType.BulkCopyAddresses,
          walletId: wallet?.id,
          networkId,
        },
      },
    });
    if (!access.granted) return;

    navigation.pushModal(EModalRoutes.BulkCopyAddressesModal, {
      screen: EModalBulkCopyAddressesRoutes.BulkCopyAddressesModal,
      params: {
        walletId: wallet?.id,
        networkId,
      },
    });
  }, [
    network?.id,
    ensureFeatureAccess,
    isSameActiveContext,
    navigation,
    wallet?.id,
  ]);

  const openBulkSendModule = useCallback(async () => {
    if (!hasBulkSendAccess) {
      // The bulk send pages open in the extension expand tab, which runs the
      // login and page-level gate itself.
      const access = await ensureFeatureAccess({
        featureId: EPrimeFeatures.BulkSend,
        networkId: network?.id,
        // Bulk send opens with this account as the sender.
        isContextValid: isSameActiveContext({
          walletId: wallet?.id,
          networkId: network?.id,
          accountId: account?.id,
          indexedAccountId: indexedAccount?.id,
        }),
        extPopup: { mode: 'passThrough' },
      });
      if (!access.granted) {
        return;
      }
    }

    showBulkSendModeDialog({
      onSelect: (mode) => {
        void navigateToBulkSend({
          networkId: network?.id,
          accountId: account?.id,
          indexedAccountId: indexedAccount?.id,
          bulkSendMode: mode,
        });
      },
    });
  }, [
    network?.id,
    account?.id,
    indexedAccount?.id,
    wallet?.id,
    navigateToBulkSend,
    showBulkSendModeDialog,
    ensureFeatureAccess,
    isSameActiveContext,
    hasBulkSendAccess,
  ]);

  const openAddressRiskCheckModule = useCallback(async () => {
    const access = await ensureFeatureAccess({
      featureId: EPrimeFeatures.AddressRiskCheck,
      networkId: network?.id,
      loginOnly: true,
      isContextValid: isSameActiveContext({
        walletId: wallet?.id,
        networkId: network?.id,
      }),
      extPopup: {
        mode: 'pendingAction',
        action: {
          type: EPrimeFreeTrialPendingActionType.AddressRiskCheck,
          networkId: network?.id,
        },
      },
    });
    if (!access.granted) {
      return;
    }
    navigation.pushModal(EModalRoutes.AddressRiskCheckModal, {
      screen: EModalAddressRiskCheckRoutes.AddressRiskCheckInput,
      params: { networkId: network?.id },
    });
  }, [
    ensureFeatureAccess,
    isSameActiveContext,
    navigation,
    network?.id,
    wallet?.id,
  ]);

  const handleBulkCopyAddresses = useCallback(() => {
    if (!isPrimeUser) {
      defaultLogger.prime.subscription.primeEntryClick({
        featureName: EPrimeFeatures.BulkCopyAddresses,
        entryPoint: 'moreActions',
        isPrimeActive,
      });
    }
    void openBulkCopyAddressesModule();
  }, [isPrimeActive, isPrimeUser, openBulkCopyAddressesModule]);

  const handleBulkSend = useCallback(() => {
    if (!hasBulkSendAccess) {
      defaultLogger.prime.subscription.primeEntryClick({
        featureName: EPrimeFeatures.BulkSend,
        entryPoint: 'moreActions',
        isPrimeActive,
      });
    }
    void openBulkSendModule();
  }, [hasBulkSendAccess, isPrimeActive, openBulkSendModule]);

  const handleAddressRiskCheck = useCallback(() => {
    if (!isPrimeUser) {
      defaultLogger.prime.subscription.primeEntryClick({
        featureName: EPrimeFeatures.AddressRiskCheck,
        entryPoint: 'moreActions',
        isPrimeActive,
      });
    }
    void openAddressRiskCheckModule();
  }, [isPrimeActive, isPrimeUser, openAddressRiskCheckModule]);

  return {
    openSettingsCategory,
    handleAddressBook,
    handleBulkCopyAddresses,
    handleBulkSend,
    handleAddressRiskCheck,
  };
}

export type IMoreActionSharedFeatureId =
  | ERecentFeatureId.Scan
  | ERecentFeatureId.Prime
  | ERecentFeatureId.SettingBackup
  | ERecentFeatureId.AddressBook
  | ERecentFeatureId.SettingNetwork
  | ERecentFeatureId.SettingPreferences
  | ERecentFeatureId.SettingSecurity
  | ERecentFeatureId.BulkCopyAddresses
  | ERecentFeatureId.BulkSend
  | ERecentFeatureId.AddressRiskCheck
  | ERecentFeatureId.Referral;

export type IMoreActionFeatureItems = Record<
  IMoreActionSharedFeatureId,
  IMoreActionContentGridItemProps | undefined
>;

/**
 * Items shown both in the Action Center grids and in the Recent card, so
 * their label, icon, gating and handler have a single definition. An item is
 * `undefined` where the platform hides it.
 */
export function useMoreActionFeatureItems(): IMoreActionFeatureItems {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const themeVariant = useThemeVariant();
  const {
    activeAccount: { network },
  } = useActiveAccount({ num: 0 });
  const handleScan = useMoreActionScan();
  const { toReferFriendsPage } = useReferFriends();
  const {
    openSettingsCategory,
    handleAddressBook,
    handleBulkCopyAddresses,
    handleBulkSend,
    handleAddressRiskCheck,
  } = useMoreActionWalletHandlers();

  const handlePrime = useCallback(() => {
    navigation.pushFullModal(EModalRoutes.PrimeModal, {
      screen: EPrimePages.PrimeDashboard,
      params: {
        networkId: network?.id,
      },
    });
  }, [navigation, network?.id]);

  return useMemo<IMoreActionFeatureItems>(() => {
    const walletOnly = (item: IMoreActionContentGridItemProps) =>
      platformEnv.isWebDappMode ? undefined : item;
    return {
      [ERecentFeatureId.Scan]: {
        title: intl.formatMessage({ id: ETranslations.scan_scan_qr_code }),
        icon: 'ScanOutline',
        onPress: () => {
          void handleScan();
        },
        trackID: 'wallet-scan',
      },
      [ERecentFeatureId.Prime]: walletOnly({
        title: 'Prime',
        icon: 'PrimeOutline',
        onPress: handlePrime,
        testID: 'wallet-prime',
        trackID: 'wallet-prime',
        isPrimeFeature: true,
        hidePrimeBadge: true,
      }),
      [ERecentFeatureId.SettingBackup]: walletOnly({
        title: intl.formatMessage({ id: ETranslations.global_backup }),
        icon: 'CloudUploadOutline',
        onPress: () => openSettingsCategory(ESettingsTabNames.Backup),
        trackID: 'wallet-backup',
      }),
      [ERecentFeatureId.AddressBook]: walletOnly({
        title: intl.formatMessage({ id: ETranslations.settings_address_book }),
        icon: 'ContactsOutline',
        onPress: handleAddressBook,
        trackID: 'wallet-address-book',
      }),
      [ERecentFeatureId.SettingNetwork]: walletOnly({
        title: intl.formatMessage({ id: ETranslations.global_network }),
        icon: 'GlobusOutline',
        onPress: () => openSettingsCategory(ESettingsTabNames.Network),
        trackID: 'wallet-network',
      }),
      [ERecentFeatureId.SettingPreferences]: {
        title: intl.formatMessage({ id: ETranslations.global_preferences }),
        icon: 'SliderThreeOutline',
        onPress: () => openSettingsCategory(ESettingsTabNames.Preferences),
        trackID: 'wallet-preferences',
      },
      [ERecentFeatureId.SettingSecurity]: walletOnly({
        title: intl.formatMessage({ id: ETranslations.global_security }),
        icon: 'Shield2CheckOutline',
        onPress: () => openSettingsCategory(ESettingsTabNames.Security),
        trackID: 'wallet-security',
      }),
      [ERecentFeatureId.BulkCopyAddresses]: walletOnly({
        title: intl.formatMessage({
          id: ETranslations.global_bulk_copy_addresses,
        }),
        icon: 'Copy3Outline',
        onPress: handleBulkCopyAddresses,
        trackID: 'bulk-copy-addresses-in-more-action',
        isPrimeFeature: true,
      }),
      [ERecentFeatureId.BulkSend]: walletOnly({
        title: intl.formatMessage({ id: ETranslations.wallet_bulk_send_title }),
        icon: 'ChevronDoubleUpOutline',
        onPress: handleBulkSend,
        trackID: 'bulk-send-in-more-action',
        isPrimeFeature: !platformEnv.isE2E,
      }),
      [ERecentFeatureId.AddressRiskCheck]: walletOnly({
        title: intl.formatMessage({
          id: ETranslations.address_risk_check__title,
        }),
        icon: 'ChecklistBoxSearchOutline',
        onPress: handleAddressRiskCheck,
        trackID: 'address-risk-check-in-more-action',
        isPrimeFeature: true,
      }),
      [ERecentFeatureId.Referral]: {
        title: intl.formatMessage({ id: ETranslations.sidebar_refer_a_friend }),
        lottieSrc:
          themeVariant === 'light' ? GiftExpandOnLight : GiftExpandOnDark,
        testID: 'referral',
        onPress: () => {
          void toReferFriendsPage();
        },
        trackID: 'wallet-referral',
      },
    };
  }, [
    intl,
    themeVariant,
    handleScan,
    handlePrime,
    openSettingsCategory,
    handleAddressBook,
    handleBulkCopyAddresses,
    handleBulkSend,
    handleAddressRiskCheck,
    toReferFriendsPage,
  ]);
}
