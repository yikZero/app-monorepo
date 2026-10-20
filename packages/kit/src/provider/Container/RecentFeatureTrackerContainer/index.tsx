import { useRef } from 'react';

import { useOnRouterChange } from '@onekeyhq/components';

import { getActiveRoutePath } from '../../../routes/activeRoutePath';
import {
  getTabFeature,
  resolveActiveTabFromRoutePath,
  resolveScreenFeatureFromRoutePath,
} from '../../../views/ActionCenter/recentFeatures/recentFeatureRegistry';
import { recordRecentFeature } from '../../../views/ActionCenter/recentFeatures/recordRecentFeature';

import type { INavigationStateLike } from '../../../routes/activeRoutePath';
import type { ERecentFeatureId } from '../../../views/ActionCenter/recentFeatures/recentFeatureRegistry';

export default function RecentFeatureTrackerContainer() {
  // Undefined until the first state, which is restored on launch and is not
  // a user visit.
  const lastRef = useRef<
    { tab?: string; screenFeature?: ERecentFeatureId } | undefined
  >(undefined);

  useOnRouterChange((state) => {
    try {
      if (!state) {
        return;
      }
      const path = getActiveRoutePath(state as INavigationStateLike);
      const tab = resolveActiveTabFromRoutePath(path);
      const screenFeature = resolveScreenFeatureFromRoutePath(path);
      const last = lastRef.current;
      lastRef.current = { tab: tab ?? last?.tab, screenFeature };
      if (!last) {
        return;
      }

      // Only a tab switch counts. Returning to the same tab after closing a
      // modal must not push the tab above the feature just used.
      const tabFeature =
        tab && tab !== last.tab ? getTabFeature(tab) : undefined;
      if (tabFeature) {
        recordRecentFeature(tabFeature);
      }
      if (screenFeature && screenFeature !== last.screenFeature) {
        recordRecentFeature(screenFeature);
      }
    } catch (error) {
      console.error('RecentFeatureTrackerContainer error', error);
    }
  });
  return null;
}
