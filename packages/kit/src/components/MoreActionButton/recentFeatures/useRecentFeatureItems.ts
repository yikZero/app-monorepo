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
import { getTabVisibility } from '../../../routes/Tab/tabVisibility';
import { useNavigateToApprovalList } from '../../../views/Home/hooks/useNavigateToApprovalList';
import { useSignAndVerify } from '../../../views/SignAndVerifyMessage/hooks/useSignAndVerify';

import { ERecentFeatureId } from './recentFeatureRoutes';

import type { IMoreActionContentGridItemProps } from '../types';
import type { IMoreActionFeatureItems } from '../useMoreActionFeatureItems';

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
}): Record<ERecentFeatureId, IMoreActionContentGridItemProps | undefined> {
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
      discoverTranslationId,
    } = getTabVisibility({ md });
    const walletAvailable = !platformEnv.isWebDappMode;
    const tabItem = (
      featureId: ERecentFeatureId,
      route: ETabRoutes,
      title: string,
      icon: IMoreActionContentGridItemProps['icon'],
    ): IMoreActionContentGridItemProps => ({
      title,
      icon,
      trackID: `recent-${featureId}`,
      onPress: () => {
        void navigation.switchTabAsync(route);
      },
    });
    const pick = (available: boolean, item: IMoreActionContentGridItemProps) =>
      available ? item : undefined;

    return {
      ...featureItems,
      [ERecentFeatureId.Swap]: tabItem(
        ERecentFeatureId.Swap,
        ETabRoutes.Swap,
        intl.formatMessage({ id: ETranslations.global_trade }),
        'SwitchHorOutline',
      ),
      [ERecentFeatureId.Market]: pick(
        shouldShowMarketTab && !isMarketTabIconHidden,
        tabItem(
          ERecentFeatureId.Market,
          ETabRoutes.Market,
          intl.formatMessage({ id: ETranslations.global_market }),
          'TradingViewCandlesOutline',
        ),
      ),
      [ERecentFeatureId.Earn]: tabItem(
        ERecentFeatureId.Earn,
        ETabRoutes.Earn,
        intl.formatMessage({ id: ETranslations.global_earn }),
        'CoinsOutline',
      ),
      [ERecentFeatureId.Perp]: pick(
        !perpDisabled,
        tabItem(
          ERecentFeatureId.Perp,
          perpTabShowWeb ? ETabRoutes.WebviewPerpTrade : ETabRoutes.Perp,
          intl.formatMessage({ id: ETranslations.global_perp }),
          'TradeOutline',
        ),
      ),
      [ERecentFeatureId.Discovery]: pick(
        isShowDesktopDiscover || isShowMDDiscover,
        tabItem(
          ERecentFeatureId.Discovery,
          ETabRoutes.Discovery,
          intl.formatMessage({ id: discoverTranslationId }),
          'CompassOutline',
        ),
      ),
      [ERecentFeatureId.Approvals]: pick(walletAvailable && hasAccount, {
        title: intl.formatMessage({ id: ETranslations.global_approvals }),
        icon: 'ShieldCheckDoneOutline',
        trackID: 'recent-approvals',
        onPress: handleApprovals,
      }),
      [ERecentFeatureId.DAppConnections]: pick(walletAvailable, {
        title: intl.formatMessage({
          id: ETranslations.explore_dapp_connections,
        }),
        icon: 'LinkOutline',
        trackID: 'recent-dapp-connections',
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
          trackID: 'recent-sign-and-verify',
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
        trackID: 'recent-export-history',
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
