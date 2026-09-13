export const EReferralPageTab = {
  invite: 'invite',
  benefits: 'benefits',
} as const;

export type IReferralPageTab =
  (typeof EReferralPageTab)[keyof typeof EReferralPageTab];

export function resolveReferralPageTab(tab?: string | null): IReferralPageTab {
  return tab === EReferralPageTab.benefits
    ? EReferralPageTab.benefits
    : EReferralPageTab.invite;
}
