export type IReferralHomeFooterInput = {
  isCompactHeader: boolean;
  isNative: boolean;
  isInviteTab: boolean;
  benefitsEnabled: boolean;
  // InviteTabContent is mounted. A summary that arrives during the invite
  // skeleton does not count: that screen has no cross-link.
  inviteContentMounted: boolean;
  hasInviteUrl: boolean;
};

export type IReferralHomeFooter = {
  pinCrossLink: boolean;
  showShareButton: boolean;
};

// Compact layouts pin the cross-link because the header switch is easy to
// miss. The invite tab waits until InviteTabContent is mounted, so the
// skeleton and error view do not grow a link they do not have. The native
// share button stays on its own condition and can show without the link.
export function getReferralHomeFooter({
  isCompactHeader,
  isNative,
  isInviteTab,
  benefitsEnabled,
  inviteContentMounted,
  hasInviteUrl,
}: IReferralHomeFooterInput): IReferralHomeFooter {
  const inviteContentReady = !isInviteTab || inviteContentMounted;
  return {
    pinCrossLink: isCompactHeader && benefitsEnabled && inviteContentReady,
    showShareButton: isNative && isInviteTab && hasInviteUrl,
  };
}
