import {
  type ERecentFeatureId,
  isMainTabFeature,
} from '../../../views/ActionCenter/recentFeatures/recentFeatureRegistry';
import { MAX_COLUMN_COUNT } from '../gridLayout';

/** The first row of the card: newest first, with at most one main tab. */
export function selectDisplayedRecentFeatures<
  T extends { featureId: ERecentFeatureId },
>(candidates: readonly T[]): T[] {
  const result: T[] = [];
  let hasMainTab = false;
  for (const candidate of candidates) {
    if (result.length >= MAX_COLUMN_COUNT) {
      break;
    }
    const isMainTab = isMainTabFeature(candidate.featureId);
    if (!(isMainTab && hasMainTab)) {
      hasMainTab = hasMainTab || isMainTab;
      result.push(candidate);
    }
  }
  return result;
}
