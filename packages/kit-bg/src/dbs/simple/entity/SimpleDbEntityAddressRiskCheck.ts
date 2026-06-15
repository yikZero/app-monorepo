import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';
import type { IAddressRiskCheckRecentItem } from '@onekeyhq/shared/types/addressRiskCheck';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

// Max number of locally-kept "Recent checks". Local device only, never synced.
const RECENT_CHECKS_CAP = 50;

export interface IAddressRiskCheckDBStruct {
  recentChecks: Record<string, IAddressRiskCheckRecentItem>;
}

function buildKey({
  networkId,
  address,
}: {
  networkId: string;
  address: string;
}) {
  return `${networkId}_${address.toLowerCase()}`;
}

export class SimpleDbEntityAddressRiskCheck extends SimpleDbEntityBase<IAddressRiskCheckDBStruct> {
  entityName = 'addressRiskCheck';

  override enableCache = false;

  @backgroundMethod()
  async getRecentChecks({
    limit = RECENT_CHECKS_CAP,
  }: { limit?: number } = {}): Promise<IAddressRiskCheckRecentItem[]> {
    const rawData = await this.getRawData();
    const recentChecks = rawData?.recentChecks ?? {};
    return Object.values(recentChecks)
      .toSorted((a, b) => b.checkedAt - a.checkedAt)
      .slice(0, limit);
  }

  @backgroundMethod()
  async addCheck(item: IAddressRiskCheckRecentItem) {
    await this.setRawData((rawData) => {
      const recentChecks = rawData?.recentChecks ?? {};
      recentChecks[buildKey(item)] = item;
      // Trim to the most recent N records by checkedAt.
      const trimmed = Object.entries(recentChecks)
        .toSorted(([, a], [, b]) => b.checkedAt - a.checkedAt)
        .slice(0, RECENT_CHECKS_CAP);
      return { recentChecks: Object.fromEntries(trimmed) };
    });
  }

  @backgroundMethod()
  async deleteCheck({
    networkId,
    address,
  }: {
    networkId: string;
    address: string;
  }) {
    await this.setRawData((rawData) => {
      const recentChecks = rawData?.recentChecks ?? {};
      delete recentChecks[buildKey({ networkId, address })];
      return { recentChecks };
    });
  }

  @backgroundMethod()
  async clearChecks() {
    await this.setRawData({ recentChecks: {} });
  }
}
