import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';

import type { ERecentFeatureId } from './recentFeatureRegistry';

export function recordRecentFeature(featureId: ERecentFeatureId) {
  backgroundApiProxy.simpleDb.recentFeatures
    .addRecentFeature({ featureId })
    .catch((error) => {
      console.error('recordRecentFeature error', error);
    });
}
