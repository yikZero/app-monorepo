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
}

export interface ISearchResultExposureParams {
  searchText: string;
  type: EUniversalSearchType;
  exposedCount: number;
}

export interface ISearchResultClickParams {
  searchText: string;
  type: EUniversalSearchType;
  itemId: string;
  itemTitle: string;
}
