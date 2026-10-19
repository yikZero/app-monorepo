import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

export const RECENT_FEATURES_CAP = 20;

export interface IRecentFeatureRecord {
  featureId: string;
  updatedAt: number;
}

export interface IRecentFeaturesDBStruct {
  recentFeatures: Record<string, { updatedAt: number }>;
}

export class SimpleDbEntityRecentFeatures extends SimpleDbEntityBase<IRecentFeaturesDBStruct> {
  entityName = 'recentFeatures';

  override enableCache = false;

  @backgroundMethod()
  async getRecentFeatures(): Promise<IRecentFeatureRecord[]> {
    const rawData = await this.getRawData();
    return Object.entries(rawData?.recentFeatures ?? {})
      .map(([featureId, { updatedAt }]) => ({ featureId, updatedAt }))
      .toSorted((a, b) => b.updatedAt - a.updatedAt);
  }

  @backgroundMethod()
  async addRecentFeature({ featureId }: { featureId: string }) {
    await this.setRawData((rawData) => {
      const recentFeatures = {
        ...rawData?.recentFeatures,
        [featureId]: { updatedAt: Date.now() },
      };
      const trimmed = Object.entries(recentFeatures)
        .toSorted(([, a], [, b]) => b.updatedAt - a.updatedAt)
        .slice(0, RECENT_FEATURES_CAP);
      return { recentFeatures: Object.fromEntries(trimmed) };
    });
  }

  @backgroundMethod()
  async clearRecentFeatures() {
    await this.setRawData({ recentFeatures: {} });
  }
}
