import { useCallback, useMemo } from 'react';

import { useIntl } from 'react-intl';

import { useMedia } from '@onekeyhq/components';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { useActiveAccount } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector/atoms';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  EModalRoutes,
  EModalSettingRoutes,
  ETabRoutes,
} from '@onekeyhq/shared/src/routes';
import { EModalBulkExportHistoryRoutes } from '@onekeyhq/shared/src/routes/bulkExportHistory';

import { usePerpTabConfig } from '../../../hooks/usePerpTabConfig';
import {
  MAIN_TAB_META,
  getPerpTabRoute,
  getTabVisibility,
} from '../../../routes/Tab/tabPlatformConfig';
import { ERecentFeatureId } from '../../../views/ActionCenter/recentFeatures/recentFeatureRegistry';
import { useNavigateToApprovalList } from '../../../views/Home/hooks/useNavigateToApprovalList';
import { useSignAndVerify } from '../../../views/SignAndVerifyMessage/hooks/useSignAndVerify';

import type { IMoreActionContentGridItemProps } from '../types';
import type { IMoreActionFeatureItems } from '../useMoreActionFeatureItems';

// The card assigns `recent-${featureId}` as the trackID; shared items keep
// theirs only so travel-mode rules keyed by trackID still apply.
export type IRecentFeatureItem = Omit<
  IMoreActionContentGridItemProps,
  'trackID'
> & { trackID?: string };

/**
 * Grid items for every recent feature: the shared Action Center items plus
 * the features that only appear in the Recent card. A feature the platform
 * or the active account cannot open maps to `undefined`. The record is
 * exhaustive so a new ERecentFeatureId fails type checking until it gets an
 * entry here.
 */
export function useRecentFeatureItems({
  featureItems,
  featureIds,
}: {
  featureItems: IMoreActionFeatureItems;
  featureIds: ERecentFeatureId[];
}): Record<ERecentFeatureId, IRecentFeatureItem | undefined> {
  const intl = useIntl();
  const { md } = useMedia();
  const navigation = useAppNavigation();
  const { perpDisabled, perpTabShowWeb } = usePerpTabConfig();
  const {
    activeAccount: { network, account, wallet },
  } = useActiveAccount({ num: 0 });
  const navigateToApprovalList = useNavigateToApprovalList();
  // The availability query is only worth running when it can be shown.
  const signAndVerify = useSignAndVerify({
    enabled: featureIds.includes(ERecentFeatureId.SignAndVerify),
  });

  // Contextual pages reopen with the current selection; no params are stored.
  const handleApprovals = useCallback(() => {
    void navigateToApprovalList({
      networkId: network?.id,
      accountId: account?.id,
      walletId: wallet?.id,
      indexedAccountId: account?.indexedAccountId,
    });
  }, [
    navigateToApprovalList,
    network?.id,
    account?.id,
    wallet?.id,
    account?.indexedAccountId,
  ]);
  const hasAccount = Boolean(network?.id && account?.id && wallet?.id);

  return useMemo(() => {
    const {
      shouldShowMarketTab,
      isMarketTabIconHidden,
      isShowDesktopDiscover,
      isShowMDDiscover,
    } = getTabVisibility({ md });
    const walletAvailable = !platformEnv.isWebDappMode;
    const tabItem = (
      metaTab: keyof typeof MAIN_TAB_META,
      route: ETabRoutes = metaTab,
    ): IRecentFeatureItem => ({
      title: intl.formatMessage({ id: MAIN_TAB_META[metaTab].translationId }),
      icon: MAIN_TAB_META[metaTab].outlineIcon,
      onPress: () => {
        void navigation.switchTabAsync(route);
      },
    });
    const pick = (available: boolean, item: IRecentFeatureItem) =>
      available ? item : undefined;

    return {
      ...featureItems,
      [ERecentFeatureId.Swap]: tabItem(ETabRoutes.Swap),
      [ERecentFeatureId.Market]: pick(
        shouldShowMarketTab && !isMarketTabIconHidden,
        tabItem(ETabRoutes.Market),
      ),
      [ERecentFeatureId.Earn]: tabItem(ETabRoutes.Earn),
      [ERecentFeatureId.Perp]: pick(
        !perpDisabled,
        tabItem(ETabRoutes.Perp, getPerpTabRoute({ perpTabShowWeb })),
      ),
      [ERecentFeatureId.Discovery]: pick(
        isShowDesktopDiscover || isShowMDDiscover,
        tabItem(ETabRoutes.Discovery),
      ),
      [ERecentFeatureId.Approvals]: pick(walletAvailable && hasAccount, {
        title: intl.formatMessage({ id: ETranslations.global_approvals }),
        icon: 'ShieldCheckDoneOutline',
        onPress: handleApprovals,
      }),
      [ERecentFeatureId.DAppConnections]: pick(walletAvailable, {
        title: intl.formatMessage({
          id: ETranslations.explore_dapp_connections,
        }),
        icon: 'LinkOutline',
        onPress: () => {
          navigation.pushModal(EModalRoutes.SettingModal, {
            screen: EModalSettingRoutes.SettingDAppConnectionList,
          });
        },
      }),
      [ERecentFeatureId.SignAndVerify]: pick(
        walletAvailable && signAndVerify.isAvailable,
        {
          title: intl.formatMessage({
            id: ETranslations.message_signing_main_title,
          }),
          icon: 'SignatureOutline',
          onPress: () => {
            signAndVerify.open();
          },
        },
      ),
      [ERecentFeatureId.ExportHistory]: pick(walletAvailable, {
        title: intl.formatMessage({
          id: ETranslations.global_export_transaction_history,
        }),
        icon: 'DownloadOutline',
        isPrimeFeature: true,
        onPress: () => {
          navigation.pushModal(EModalRoutes.BulkExportHistoryModal, {
            screen: EModalBulkExportHistoryRoutes.BulkExportHistoryModal,
            params: { networkId: network?.id },
          });
        },
      }),
    };
  }, [
    featureItems,
    intl,
    md,
    navigation,
    perpDisabled,
    perpTabShowWeb,
    hasAccount,
    handleApprovals,
    signAndVerify,
    network?.id,
  ]);
}
