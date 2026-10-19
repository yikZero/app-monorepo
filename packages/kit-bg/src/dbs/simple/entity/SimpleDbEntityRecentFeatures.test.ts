import {
  type IRecentFeaturesDBStruct,
  RECENT_FEATURES_CAP,
  SimpleDbEntityRecentFeatures,
} from './SimpleDbEntityRecentFeatures';

function setupEntity(
  initial: IRecentFeaturesDBStruct = { recentFeatures: {} },
) {
  const entity = new SimpleDbEntityRecentFeatures();
  let store: IRecentFeaturesDBStruct = initial;
  jest.spyOn(entity, 'getRawData').mockImplementation(async () => store);
  jest.spyOn(entity, 'setRawData').mockImplementation(async (builder) => {
    store = typeof builder === 'function' ? await builder(store) : builder;
    return store;
  });
  return { entity, getStore: () => store };
}

describe('SimpleDbEntityRecentFeatures', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns features newest first', async () => {
    const { entity } = setupEntity({
      recentFeatures: {
        scan: { updatedAt: 100 },
        swap: { updatedAt: 300 },
        prime: { updatedAt: 200 },
      },
    });
    expect(await entity.getRecentFeatures()).toEqual([
      { featureId: 'swap', updatedAt: 300 },
      { featureId: 'prime', updatedAt: 200 },
      { featureId: 'scan', updatedAt: 100 },
    ]);
  });

  test('handles empty storage', async () => {
    const entity = new SimpleDbEntityRecentFeatures();
    jest.spyOn(entity, 'getRawData').mockResolvedValue(null);
    expect(await entity.getRecentFeatures()).toEqual([]);
  });

  test('upserts a feature with the current time', async () => {
    jest.useFakeTimers().setSystemTime(1000);
    const { entity, getStore } = setupEntity({
      recentFeatures: { scan: { updatedAt: 1 } },
    });
    await entity.addRecentFeature({ featureId: 'scan' });
    expect(getStore().recentFeatures).toEqual({ scan: { updatedAt: 1000 } });
  });

  test('keeps only the newest entries up to the cap', async () => {
    const recentFeatures: IRecentFeaturesDBStruct['recentFeatures'] = {};
    for (let i = 0; i < RECENT_FEATURES_CAP; i += 1) {
      recentFeatures[`feature-${i}`] = { updatedAt: i + 1 };
    }
    jest.useFakeTimers().setSystemTime(10_000);
    const { entity, getStore } = setupEntity({ recentFeatures });

    await entity.addRecentFeature({ featureId: 'new' });

    const stored = getStore().recentFeatures;
    expect(Object.keys(stored)).toHaveLength(RECENT_FEATURES_CAP);
    expect(stored.new).toEqual({ updatedAt: 10_000 });
    expect(stored['feature-0']).toBeUndefined();
  });

  test('clears all features', async () => {
    const { entity, getStore } = setupEntity({
      recentFeatures: { scan: { updatedAt: 1 } },
    });
    await entity.clearRecentFeatures();
    expect(getStore()).toEqual({ recentFeatures: {} });
  });
});
