import { BaseScene } from '../../../base/baseScene';
import { LogToLocal, LogToServer } from '../../../base/decorators';

import type {
  ISettingsSearchClickParams,
  ISettingsSearchExposureParams,
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
   * Track when settings items are exposed in search results
   * Fired when search returns settings matches visible to the user
   */
  @LogToServer()
  @LogToLocal({ level: 'info' })
  public settingsSearchExposure(params: ISettingsSearchExposureParams) {
    return params;
  }

  /**
   * Track when user clicks a settings search result to navigate
   * Represents completed feature reach
   */
  @LogToServer()
  @LogToLocal({ level: 'info' })
  public settingsSearchClick(params: ISettingsSearchClickParams) {
    return params;
  }
}
