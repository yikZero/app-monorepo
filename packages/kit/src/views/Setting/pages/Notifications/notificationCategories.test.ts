import {
  buildMarketingGroupUpdate,
  getMarketUpdatesStatus,
  getMarketingGroups,
} from './notificationCategories';

describe('notification marketing groups', () => {
  it('treats missing group fields as enabled behind an open gate', () => {
    expect(getMarketingGroups({ dailyUpdateEnabled: true })).toEqual({
      marketUpdates: true,
      campaigns: true,
    });
  });

  it('turns both groups off when an older client closes the gate', () => {
    expect(
      getMarketingGroups({
        dailyUpdateEnabled: false,
        marketUpdatesEnabled: true,
        campaignsEnabled: true,
      }),
    ).toEqual({ marketUpdates: false, campaigns: false });
  });

  it('does not revive the other group when one group is turned on behind a closed gate', () => {
    expect(
      buildMarketingGroupUpdate(
        { dailyUpdateEnabled: false },
        { campaigns: true },
      ),
    ).toEqual({
      marketUpdatesEnabled: false,
      campaignsEnabled: true,
      dailyUpdateEnabled: true,
    });
  });

  it('closes the gate once both groups are off', () => {
    expect(
      buildMarketingGroupUpdate(
        { dailyUpdateEnabled: true, campaignsEnabled: false },
        { marketUpdates: false },
      ),
    ).toEqual({
      marketUpdatesEnabled: false,
      campaignsEnabled: false,
      dailyUpdateEnabled: false,
    });
  });

  it('summarizes market update sub categories', () => {
    expect(getMarketUpdatesStatus({ dailyUpdateEnabled: true })).toBe('On');
    expect(
      getMarketUpdatesStatus({
        dailyUpdateEnabled: true,
        marketingSubs: { perps: false },
      }),
    ).toBe('3/4');
    expect(
      getMarketUpdatesStatus({
        dailyUpdateEnabled: true,
        marketUpdatesEnabled: false,
      }),
    ).toBe('Off');
  });
});
