import type { EUniversalSearchType } from '@onekeyhq/shared/types/search';

export interface IUniversalSearchParams {
  /**
   * The search text entered by the user
   */
  searchText: string;
  /**
   * Total number of search results
   */
  resultCount: number;
  /**
   * Per-type result breakdown, e.g. "V2MarketToken:5,Perp:3,Settings:2"
   */
  exposedTypes: string;
}

export interface ISearchResultClickParams {
  searchText: string;
  type: EUniversalSearchType;
  itemId: string;
  itemTitle: string;
}
