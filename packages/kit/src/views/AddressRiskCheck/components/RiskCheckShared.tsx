import type { ColorTokens } from '@onekeyhq/components';
import { Popover, SizableText, XStack, YStack } from '@onekeyhq/components';
import type { IBadgeType } from '@onekeyhq/components/src/content/Badge';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { appLocale } from '@onekeyhq/shared/src/locale/appLocale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { formatDate } from '@onekeyhq/shared/src/utils/dateUtils';
import { EKytRiskLevel } from '@onekeyhq/shared/types/kyt';

// CJK locales render dates in "年/月/日"-style, so use the localized long date
// format (e.g. 2024年6月19日) to keep the day unit; other locales keep the
// "MMM d, yyyy" presentation.
const CJK_DATE_LOCALES = new Set(['zh-CN', 'zh-HK', 'zh-TW', 'ja-JP', 'ko-KR']);

export function formatRiskCheckDate(
  seconds: number,
  { withTime = false }: { withTime?: boolean } = {},
) {
  if (!seconds) {
    return '-';
  }
  const datePart = CJK_DATE_LOCALES.has(appLocale.getLocale())
    ? 'PPP'
    : 'MMM d, yyyy';
  return formatDate(new Date(seconds * 1000), {
    formatTemplate: withTime ? `${datePart} HH:mm` : datePart,
  });
}

// Orange marks High so the four scored levels read green / amber / orange /
// red. The design system has no semantic orange, so these follow the same
// palette steps the semantic tokens use: 11 for text, 9 for solid fills and
// 3 for subtle backgrounds. Palette tokens switch with the light/dark theme.
export const HIGH_RISK_COLOR = {
  text: '$orange11',
  solid: '$orange9',
  subtle: '$orange3',
} as const satisfies Record<string, ColorTokens>;

// Risk level → text color.
export const LEVEL_TEXT_COLOR: Record<EKytRiskLevel, ColorTokens> = {
  [EKytRiskLevel.None]: '$textSuccess',
  [EKytRiskLevel.Checking]: '$textSubdued',
  [EKytRiskLevel.Failed]: '$textSubdued',
  [EKytRiskLevel.Low]: '$textSuccess',
  [EKytRiskLevel.Moderate]: '$textCaution',
  [EKytRiskLevel.High]: HIGH_RISK_COLOR.text,
  [EKytRiskLevel.Severe]: '$textCritical',
};

// Risk level → badge type, used by recent/history list tags.
export const LEVEL_BADGE_TYPE: Record<EKytRiskLevel, IBadgeType> = {
  [EKytRiskLevel.None]: 'success',
  [EKytRiskLevel.Checking]: 'default',
  [EKytRiskLevel.Failed]: 'default',
  [EKytRiskLevel.Low]: 'success',
  [EKytRiskLevel.Moderate]: 'warning',
  [EKytRiskLevel.High]: 'warning',
  [EKytRiskLevel.Severe]: 'critical',
};

// Badge has no orange type; High overrides the warning badge colors.
export const LEVEL_BADGE_COLOR_OVERRIDE: Partial<
  Record<EKytRiskLevel, { bg: ColorTokens; color: ColorTokens }>
> = {
  [EKytRiskLevel.High]: {
    bg: HIGH_RISK_COLOR.subtle,
    color: HIGH_RISK_COLOR.text,
  },
};

// Short level name shown in the summary card / list tags (None / Low / …).
export const LEVEL_TITLE: Record<EKytRiskLevel, ETranslations> = {
  [EKytRiskLevel.None]: ETranslations.kyt_risk_level_none__title,
  [EKytRiskLevel.Checking]: ETranslations.kyt_risk_level_checking__title,
  [EKytRiskLevel.Failed]: ETranslations.kyt_risk_check_failed__title,
  [EKytRiskLevel.Low]: ETranslations.kyt_risk_level_low__title,
  [EKytRiskLevel.Moderate]: ETranslations.kyt_risk_level_moderate__title,
  [EKytRiskLevel.High]: ETranslations.kyt_risk_level_high__title,
  [EKytRiskLevel.Severe]: ETranslations.kyt_risk_level_severe__title,
};

export function CardRow({
  label,
  children,
  tooltip,
}: {
  label: string;
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <XStack px="$4" py="$2.5" ai="center" jc="space-between" gap="$2">
      <XStack ai="center" gap="$1" flexShrink={0}>
        <SizableText size="$bodyMd" color="$textSubdued">
          {label}
        </SizableText>
        {tooltip ? (
          <Popover.Tooltip
            title={label}
            tooltip={tooltip}
            placement="bottom"
            iconSize="$4"
            renderContent={
              <YStack px="$5" pb="$5" pt={platformEnv.isNative ? '$0' : '$5'}>
                <SizableText size="$bodyLg">{tooltip}</SizableText>
              </YStack>
            }
          />
        ) : null}
      </XStack>
      {children}
    </XStack>
  );
}
