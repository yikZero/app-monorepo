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

export interface ISettingsSearchExposureParams {
  searchText: string;
  exposedItems: string[];
}

export interface ISettingsSearchClickParams {
  searchText: string;
  settingTitle: string;
  settingRoute: string;
  sectionTitle: string;
}
