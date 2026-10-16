import BigNumber from 'bignumber.js';

import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EKytRiskLevel } from '@onekeyhq/shared/types/kyt';
import type { IKytRiskFactor } from '@onekeyhq/shared/types/kyt';

export function getAddressRiskCheckPendingMessageIds({
  isFailed,
  isInternetReachable,
}: {
  isFailed: boolean;
  isInternetReachable?: boolean | null;
}) {
  if (isFailed && isInternetReachable === false) {
    return {
      title: ETranslations.tray_offline_title,
      description: ETranslations.feedback_you_are_offline,
    };
  }
  return isFailed
    ? {
        title: ETranslations.address_risk_check_level_failed__title,
        description: ETranslations.address_risk_check_level_failed__desc,
      }
    : {
        title: ETranslations.address_risk_check_level_checking__title,
        description: ETranslations.address_risk_check_loading__desc,
      };
}

// Exposures below this share (in percent) are usually dust, spam, or address
// poisoning transfers the owner did not initiate; they are folded by default.
export const MINOR_EXPOSURE_PERCENT = 0.1;
const MIN_VISIBLE_EXPOSURES = 3;
const MAX_VISIBLE_EXPOSURES = 5;

// MistTrack score bands (inclusive upper bounds). The meter draws them as four
// equal-width segments so each label fits on narrow mobile screens.
export const RISK_SCORE_BANDS: {
  level: EKytRiskLevel;
  min: number;
  max: number;
}[] = [
  { level: EKytRiskLevel.Low, min: 0, max: 30 },
  { level: EKytRiskLevel.Moderate, min: 30, max: 70 },
  { level: EKytRiskLevel.High, min: 70, max: 90 },
  { level: EKytRiskLevel.Severe, min: 90, max: 100 },
];

export type IAddressRiskSummaryVariant =
  | 'clean'
  | 'low'
  | 'moderate'
  | 'high'
  | 'severe'
  | 'unknown';

export function getAddressRiskSummaryVariant({
  level,
  factorCount,
}: {
  level: EKytRiskLevel;
  factorCount: number;
}): IAddressRiskSummaryVariant {
  switch (level) {
    case EKytRiskLevel.None:
      return 'clean';
    case EKytRiskLevel.Low:
      return factorCount > 0 ? 'low' : 'clean';
    case EKytRiskLevel.Moderate:
      return 'moderate';
    case EKytRiskLevel.High:
      return 'high';
    case EKytRiskLevel.Severe:
      return 'severe';
    default:
      return 'unknown';
  }
}

export function sortRiskFactors(factors: IKytRiskFactor[]): IKytRiskFactor[] {
  return [...factors].toSorted(
    (a, b) =>
      (b.percent ?? -1) - (a.percent ?? -1) ||
      (b.amountUsd ?? -1) - (a.amountUsd ?? -1),
  );
}

export function isMinorRiskFactor(factor: IKytRiskFactor) {
  return (
    factor.percent !== undefined && factor.percent < MINOR_EXPOSURE_PERCENT
  );
}

export function getRiskFactorDisplay(factors: IKytRiskFactor[]) {
  const sorted = sortRiskFactors(factors);
  const significantCount = sorted.filter(
    (factor) => !isMinorRiskFactor(factor),
  ).length;
  const visibleCount = Math.min(
    sorted.length,
    Math.max(
      Math.min(significantCount, MAX_VISIBLE_EXPOSURES),
      MIN_VISIBLE_EXPOSURES,
    ),
  );
  const hidden = sorted.slice(visibleCount);
  return {
    sorted,
    visibleCount,
    hiddenCount: hidden.length,
    hiddenAllMinor: hidden.length > 0 && hidden.every(isMinorRiskFactor),
  };
}

export function getRiskExposureStats(factors: IKytRiskFactor[]) {
  const percents = factors
    .map((factor) => factor.percent)
    .filter((percent): percent is number => percent !== undefined);
  return {
    total: factors.length,
    direct: factors.filter((factor) => factor.exposureType === 'direct').length,
    largestPercent: percents.length ? Math.max(...percents) : undefined,
  };
}

export function formatRiskPercent(percent: number | undefined) {
  if (percent === undefined || !Number.isFinite(percent)) {
    return '-';
  }
  if (percent > 0 && percent < 0.01) {
    return '<0.01%';
  }
  return `${new BigNumber(percent).decimalPlaces(2).toFixed()}%`;
}

// Position of the score on the meter (0-100), mapped piecewise so every band
// takes 25% of the width regardless of its numeric range.
export function getRiskScoreMeterPosition(score: number) {
  const clamped = Math.min(100, Math.max(0, score));
  const bandIndex = Math.max(
    0,
    RISK_SCORE_BANDS.findIndex((band) => clamped <= band.max),
  );
  const band = RISK_SCORE_BANDS[bandIndex];
  const ratio = (clamped - band.min) / (band.max - band.min);
  const bandWidth = 100 / RISK_SCORE_BANDS.length;
  return {
    bandIndex,
    positionPercent: bandIndex * bandWidth + Math.max(0, ratio) * bandWidth,
  };
}
