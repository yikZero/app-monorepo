import { EModalAddressBookRoutes } from '@onekeyhq/shared/src/routes/addressBook';
import { EModalAddressRiskCheckRoutes } from '@onekeyhq/shared/src/routes/addressRiskCheck';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';
import { EModalBulkCopyAddressesRoutes } from '@onekeyhq/shared/src/routes/bulkCopyAddresses';
import { EModalBulkExportHistoryRoutes } from '@onekeyhq/shared/src/routes/bulkExportHistory';
import { EModalBulkSendRoutes } from '@onekeyhq/shared/src/routes/bulkSend';
import { EDAppConnectionModal } from '@onekeyhq/shared/src/routes/dAppConnection';
import { EModalRoutes } from '@onekeyhq/shared/src/routes/modal';
import { EPrimePages } from '@onekeyhq/shared/src/routes/prime';
import { EModalReferFriendsRoutes } from '@onekeyhq/shared/src/routes/referFriends';
import { ERootRoutes } from '@onekeyhq/shared/src/routes/root';
import {
  EModalSettingRoutes,
  ESettingsTabNames,
} from '@onekeyhq/shared/src/routes/setting';
import { EModalSignAndVerifyRoutes } from '@onekeyhq/shared/src/routes/signAndVerify';
import { ETabRoutes } from '@onekeyhq/shared/src/routes/tab';
import { ETabHomeRoutes } from '@onekeyhq/shared/src/routes/tabHome';

import { MAX_COLUMN_COUNT } from '../gridLayout';

import type { IActiveRoute } from '../../../routes/activeRoutePath';

// Persisted as plain strings in SimpleDb; never rename existing values.
export enum ERecentFeatureId {
  AddressRiskCheck = 'addressRiskCheck',
  BulkSend = 'bulkSend',
  BulkCopyAddresses = 'bulkCopyAddresses',
  AddressBook = 'addressBook',
  Prime = 'prime',
  SettingNetwork = 'settingNetwork',
  SettingBackup = 'settingBackup',
  SettingSecurity = 'settingSecurity',
  SettingPreferences = 'settingPreferences',
  Scan = 'scan',
  Swap = 'swap',
  Market = 'market',
  Earn = 'earn',
  Perp = 'perp',
  Discovery = 'discovery',
  Referral = 'referral',
  Approvals = 'approvals',
  DAppConnections = 'dappConnections',
  SignAndVerify = 'signAndVerify',
  ExportHistory = 'exportHistory',
}

/**
 * How a visit to each feature is detected (at least one source each):
 * - `tabs`: switching to one of these tabs.
 * - `screens`: reaching one of these `parentRoute/screen` pairs. Keying by the
 *   parent keeps generic names such as `ListItemModal` inside their stack.
 * - `settingCategory`: the settings sub page for this category.
 * - `onPress`: no landing route; the entry calls `recordRecentFeature`.
 * `isMainTab` marks frequently switched tabs; the card shows at most one.
 */
export type IRecentFeatureRecording = {
  tabs?: ETabRoutes[];
  screens?: string[];
  settingCategory?: ESettingsTabNames;
  onPress?: true;
  isMainTab?: true;
};

const screen = (parent: string, name: string) => `${parent}/${name}`;

export const RECENT_FEATURE_RECORDING: Record<
  ERecentFeatureId,
  IRecentFeatureRecording
> = {
  [ERecentFeatureId.AddressRiskCheck]: {
    screens: [
      screen(
        EModalRoutes.AddressRiskCheckModal,
        EModalAddressRiskCheckRoutes.AddressRiskCheckInput,
      ),
    ],
  },
  [ERecentFeatureId.BulkSend]: {
    screens: [
      screen(
        EModalRoutes.BulkSendModal,
        EModalBulkSendRoutes.BulkSendAddressesInput,
      ),
      screen(ETabRoutes.Home, ETabHomeRoutes.TabHomeBulkSendAddressesInput),
    ],
  },
  [ERecentFeatureId.BulkCopyAddresses]: {
    screens: [
      screen(
        EModalRoutes.BulkCopyAddressesModal,
        EModalBulkCopyAddressesRoutes.BulkCopyAddressesModal,
      ),
    ],
  },
  [ERecentFeatureId.AddressBook]: {
    screens: [
      screen(
        EModalRoutes.AddressBookModal,
        EModalAddressBookRoutes.ListItemModal,
      ),
    ],
  },
  [ERecentFeatureId.Prime]: {
    screens: [screen(EModalRoutes.PrimeModal, EPrimePages.PrimeDashboard)],
  },
  [ERecentFeatureId.SettingNetwork]: {
    settingCategory: ESettingsTabNames.Network,
  },
  [ERecentFeatureId.SettingBackup]: {
    settingCategory: ESettingsTabNames.Backup,
  },
  [ERecentFeatureId.SettingSecurity]: {
    settingCategory: ESettingsTabNames.Security,
  },
  [ERecentFeatureId.SettingPreferences]: {
    settingCategory: ESettingsTabNames.Preferences,
  },
  [ERecentFeatureId.Scan]: { onPress: true },
  [ERecentFeatureId.Swap]: { tabs: [ETabRoutes.Swap], isMainTab: true },
  [ERecentFeatureId.Market]: { tabs: [ETabRoutes.Market], isMainTab: true },
  [ERecentFeatureId.Earn]: { tabs: [ETabRoutes.Earn], isMainTab: true },
  [ERecentFeatureId.Perp]: {
    tabs: [ETabRoutes.Perp, ETabRoutes.WebviewPerpTrade],
    isMainTab: true,
  },
  [ERecentFeatureId.Discovery]: {
    tabs: [ETabRoutes.Discovery],
    isMainTab: true,
  },
  [ERecentFeatureId.Referral]: {
    // Native opens a modal; other platforms switch to the ReferFriends tab.
    tabs: [ETabRoutes.ReferFriends],
    screens: [
      screen(
        EModalRoutes.ReferFriendsModal,
        EModalReferFriendsRoutes.ReferAFriend,
      ),
    ],
  },
  [ERecentFeatureId.Approvals]: {
    screens: [
      screen(
        EModalRoutes.ApprovalManagementModal,
        EModalApprovalManagementRoutes.ApprovalList,
      ),
      screen(ETabRoutes.Home, ETabHomeRoutes.TabHomeApprovalList),
    ],
  },
  [ERecentFeatureId.DAppConnections]: {
    screens: [
      screen(
        EModalRoutes.SettingModal,
        EModalSettingRoutes.SettingDAppConnectionList,
      ),
      screen(
        EModalRoutes.DAppConnectionModal,
        EDAppConnectionModal.ConnectionList,
      ),
    ],
  },
  [ERecentFeatureId.SignAndVerify]: {
    screens: [
      screen(
        EModalRoutes.SignAndVerifyModal,
        EModalSignAndVerifyRoutes.SignAndVerifyMessage,
      ),
    ],
  },
  [ERecentFeatureId.ExportHistory]: {
    screens: [
      screen(
        EModalRoutes.BulkExportHistoryModal,
        EModalBulkExportHistoryRoutes.BulkExportHistoryModal,
      ),
    ],
  },
};

const featureByTab = new Map<string, ERecentFeatureId>();
const featureByScreen = new Map<string, ERecentFeatureId>();
const featureBySettingCategory = new Map<string, ERecentFeatureId>();
const mainTabFeatureIds = new Set<ERecentFeatureId>();
for (const [featureId, recording] of Object.entries(
  RECENT_FEATURE_RECORDING,
) as [ERecentFeatureId, IRecentFeatureRecording][]) {
  recording.tabs?.forEach((tab) => featureByTab.set(tab, featureId));
  recording.screens?.forEach((key) => featureByScreen.set(key, featureId));
  if (recording.settingCategory) {
    featureBySettingCategory.set(recording.settingCategory, featureId);
  }
  if (recording.isMainTab) {
    mainTabFeatureIds.add(featureId);
  }
}

const recentFeatureIds = new Set<string>(Object.values(ERecentFeatureId));

export function isRecentFeatureId(value: string): value is ERecentFeatureId {
  return recentFeatureIds.has(value);
}

/**
 * The active tab of the main tab navigator, or `undefined` when an overlay
 * (modal, full screen page) is above it.
 */
export function resolveActiveTabFromRoutePath(
  path: IActiveRoute[],
): string | undefined {
  if (path[0]?.name !== ERootRoutes.Main) {
    return undefined;
  }
  return path[1]?.name;
}

export function getTabFeature(tab: string): ERecentFeatureId | undefined {
  return featureByTab.get(tab);
}

/**
 * Resolves a feature landing screen from the leaf route. Only route names and
 * the settings category enum are read; other params are never stored.
 */
export function resolveScreenFeatureFromRoutePath(
  path: IActiveRoute[],
): ERecentFeatureId | undefined {
  if (path.length < 2) {
    return undefined;
  }
  const leaf = path[path.length - 1];
  const parent = path[path.length - 2];
  if (
    parent.name === EModalRoutes.SettingModal &&
    leaf.name === EModalSettingRoutes.SettingListSubModal
  ) {
    const category = (leaf.params as { name?: unknown } | undefined)?.name;
    return typeof category === 'string'
      ? featureBySettingCategory.get(category)
      : undefined;
  }
  return featureByScreen.get(screen(parent.name, leaf.name));
}

/** The first row of the card: newest first, with at most one main tab. */
export function selectDisplayedRecentFeatures<
  T extends { featureId: ERecentFeatureId },
>(candidates: readonly T[]): T[] {
  const result: T[] = [];
  let hasTab = false;
  for (const candidate of candidates) {
    if (result.length >= MAX_COLUMN_COUNT) {
      break;
    }
    const isTab = mainTabFeatureIds.has(candidate.featureId);
    if (!(isTab && hasTab)) {
      hasTab = hasTab || isTab;
      result.push(candidate);
    }
  }
  return result;
}
