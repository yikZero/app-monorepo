import { BaseScene } from '../../../base/baseScene';
import { LogToLocal, LogToServer } from '../../../base/decorators';

import type {
  ISearchResultClickParams,
  ISearchResultExposureParams,
  IUniversalSearchParams,
} from '../types';

export class SearchScene extends BaseScene {
  /**
   * Track when user performs a search
   * Used to understand what users are searching for (trending topics)
   */
  @LogToServer()
  @LogToLocal({ level: 'info' })
  public universalSearchQuery(params: IUniversalSearchParams) {
    return params;
  }

  /**
   * Track when search results are exposed to the user
   * Fired once per result type when search completes
   */
  @LogToServer()
  @LogToLocal({ level: 'info' })
  public universalSearchExposure(params: ISearchResultExposureParams) {
    return params;
  }

  /**
   * Track when user clicks a search result
   * Represents completed feature reach
   */
  @LogToServer()
  @LogToLocal({ level: 'info' })
  public universalSearchClick(params: ISearchResultClickParams) {
    return params;
  }
}
