import type { ColorTokens } from '@onekeyhq/components';

// Orange marks High so the four scored KYT levels read green / amber / orange /
// red across the address risk check and incoming-transfer screening. The
// design system has no semantic orange, so these follow the same palette steps
// the semantic tokens use: 11 for text, 9 for solid fills and 3 for subtle
// backgrounds. Palette tokens switch with the light/dark theme.
export const KYT_HIGH_RISK_COLOR = {
  text: '$orange11',
  solid: '$orange9',
  subtle: '$orange3',
} as const satisfies Record<string, ColorTokens>;

// Badge has no orange type: render High as a warning badge with these colors
// applied to the badge frame (`bg`) and its text (`color`).
export const KYT_HIGH_RISK_BADGE_COLOR = {
  bg: KYT_HIGH_RISK_COLOR.subtle,
  color: KYT_HIGH_RISK_COLOR.text,
} as const satisfies Record<string, ColorTokens>;
