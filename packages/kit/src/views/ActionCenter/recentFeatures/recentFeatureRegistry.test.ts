import { EModalAddressBookRoutes } from '@onekeyhq/shared/src/routes/addressBook';
import { EModalAddressRiskCheckRoutes } from '@onekeyhq/shared/src/routes/addressRiskCheck';
import { EModalRoutes } from '@onekeyhq/shared/src/routes/modal';
import { ERootRoutes } from '@onekeyhq/shared/src/routes/root';
import {
  EModalSettingRoutes,
  ESettingsTabNames,
} from '@onekeyhq/shared/src/routes/setting';
import { ETabRoutes } from '@onekeyhq/shared/src/routes/tab';
import { ETabHomeRoutes } from '@onekeyhq/shared/src/routes/tabHome';

import {
  ERecentFeatureId,
  RECENT_FEATURE_RECORDING,
  getTabFeature,
  isMainTabFeature,
  isRecentFeatureId,
  resolveActiveTabFromRoutePath,
  resolveScreenFeatureFromRoutePath,
} from './recentFeatureRegistry';

describe('RECENT_FEATURE_RECORDING', () => {
  it.each(Object.entries(RECENT_FEATURE_RECORDING))(
    '%s declares how it is recorded',
    (_, recording) => {
      expect(
        Boolean(
          recording.tabs?.length ||
          recording.screens?.length ||
          recording.settingCategory ||
          recording.onPress,
        ),
      ).toBe(true);
    },
  );
});

describe('tab resolution', () => {
  it('resolves the active main tab', () => {
    const path = [
      { name: ERootRoutes.Main },
      { name: ETabRoutes.Swap },
      { name: 'TabSwap' },
    ];
    expect(resolveActiveTabFromRoutePath(path)).toBe(ETabRoutes.Swap);
    expect(getTabFeature(ETabRoutes.Swap)).toBe(ERecentFeatureId.Swap);
  });

  it('maps both perp tab variants to the same feature', () => {
    expect(getTabFeature(ETabRoutes.WebviewPerpTrade)).toBe(
      ERecentFeatureId.Perp,
    );
    expect(getTabFeature(ETabRoutes.Perp)).toBe(ERecentFeatureId.Perp);
  });

  it('maps the referral tab and ignores Home', () => {
    expect(getTabFeature(ETabRoutes.ReferFriends)).toBe(
      ERecentFeatureId.Referral,
    );
    expect(getTabFeature(ETabRoutes.Home)).toBeUndefined();
  });

  it('ignores overlays above the tabs', () => {
    expect(
      resolveActiveTabFromRoutePath([
        { name: ERootRoutes.Modal },
        { name: EModalRoutes.SettingModal },
      ]),
    ).toBeUndefined();
  });
});

describe('resolveScreenFeatureFromRoutePath', () => {
  it('matches a modal landing screen inside its own stack', () => {
    expect(
      resolveScreenFeatureFromRoutePath([
        { name: ERootRoutes.Modal },
        { name: EModalRoutes.AddressRiskCheckModal },
        {
          name: EModalAddressRiskCheckRoutes.AddressRiskCheckInput,
          params: { networkId: 'evm--1' },
        },
      ]),
    ).toBe(ERecentFeatureId.AddressRiskCheck);
  });

  it('does not match a generic screen name in another stack', () => {
    expect(
      resolveScreenFeatureFromRoutePath([
        { name: ERootRoutes.Modal },
        { name: EModalRoutes.SendModal },
        { name: EModalAddressBookRoutes.ListItemModal },
      ]),
    ).toBeUndefined();
  });

  it('matches bulk send opened inside the Home tab', () => {
    expect(
      resolveScreenFeatureFromRoutePath([
        { name: ERootRoutes.Main },
        { name: ETabRoutes.Home },
        { name: ETabHomeRoutes.TabHomeBulkSendAddressesInput },
      ]),
    ).toBe(ERecentFeatureId.BulkSend);
  });

  it.each([
    [
      [EModalRoutes.ApprovalManagementModal, 'ApprovalList'],
      ERecentFeatureId.Approvals,
    ],
    [[ETabRoutes.Home, 'TabHomeApprovalList'], ERecentFeatureId.Approvals],
    [
      [EModalRoutes.SettingModal, 'SettingDAppConnectionList'],
      ERecentFeatureId.DAppConnections,
    ],
    [
      [EModalRoutes.DAppConnectionModal, 'ConnectionList'],
      ERecentFeatureId.DAppConnections,
    ],
    [
      [EModalRoutes.SignAndVerifyModal, 'SignAndVerifyMessage'],
      ERecentFeatureId.SignAndVerify,
    ],
    [
      [EModalRoutes.BulkExportHistoryModal, 'BulkExportHistoryModal'],
      ERecentFeatureId.ExportHistory,
    ],
  ])('matches %j to %s', ([parent, leaf], featureId) => {
    expect(
      resolveScreenFeatureFromRoutePath([
        { name: ERootRoutes.Modal },
        { name: parent },
        { name: leaf },
      ]),
    ).toBe(featureId);
  });

  it('matches whitelisted settings categories only', () => {
    const settingsPath = (name: ESettingsTabNames) => [
      { name: ERootRoutes.Modal },
      { name: EModalRoutes.SettingModal },
      { name: EModalSettingRoutes.SettingListSubModal, params: { name } },
    ];
    expect(
      resolveScreenFeatureFromRoutePath(
        settingsPath(ESettingsTabNames.Network),
      ),
    ).toBe(ERecentFeatureId.SettingNetwork);
    expect(
      resolveScreenFeatureFromRoutePath(settingsPath(ESettingsTabNames.About)),
    ).toBeUndefined();
  });

  it('returns undefined for unknown routes', () => {
    expect(
      resolveScreenFeatureFromRoutePath([
        { name: ERootRoutes.Modal },
        { name: 'UnknownModal' },
        { name: 'UnknownScreen' },
      ]),
    ).toBeUndefined();
    expect(resolveScreenFeatureFromRoutePath([])).toBeUndefined();
  });
});

describe('isRecentFeatureId', () => {
  it('accepts known ids and rejects unknown ones', () => {
    expect(isRecentFeatureId(ERecentFeatureId.Scan)).toBe(true);
    expect(isRecentFeatureId('removedFeature')).toBe(false);
    expect(isRecentFeatureId('toString')).toBe(false);
  });
});

describe('isMainTabFeature', () => {
  it('marks frequently switched tabs only', () => {
    expect(isMainTabFeature(ERecentFeatureId.Swap)).toBe(true);
    expect(isMainTabFeature(ERecentFeatureId.Referral)).toBe(false);
    expect(isMainTabFeature(ERecentFeatureId.Scan)).toBe(false);
  });
});
