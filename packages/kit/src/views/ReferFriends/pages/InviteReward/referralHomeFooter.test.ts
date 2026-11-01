import { getReferralHomeFooter } from './referralHomeFooter';

import type { IReferralHomeFooterInput } from './referralHomeFooter';

const LOADED_INVITE: IReferralHomeFooterInput = {
  isCompactHeader: false,
  isNative: false,
  isInviteTab: true,
  benefitsEnabled: true,
  inviteContentMounted: true,
  hasInviteUrl: true,
};

describe('getReferralHomeFooter', () => {
  it('pins the perks cross-link and leaves the share button off', () => {
    expect(
      getReferralHomeFooter({
        ...LOADED_INVITE,
        isCompactHeader: true,
        isInviteTab: false,
        inviteContentMounted: false,
        hasInviteUrl: false,
      }),
    ).toEqual({ pinCrossLink: true, showShareButton: false });
  });

  it('pins the cross-link and the share button on the native invite tab', () => {
    expect(
      getReferralHomeFooter({
        ...LOADED_INVITE,
        isCompactHeader: true,
        isNative: true,
      }),
    ).toEqual({ pinCrossLink: true, showShareButton: true });
  });

  it('pins only the cross-link on narrow web invite', () => {
    expect(
      getReferralHomeFooter({
        ...LOADED_INVITE,
        isCompactHeader: true,
      }),
    ).toEqual({ pinCrossLink: true, showShareButton: false });
  });

  it('leaves both in the scrolling content on a wide layout', () => {
    expect(getReferralHomeFooter(LOADED_INVITE)).toEqual({
      pinCrossLink: false,
      showShareButton: false,
    });
  });

  it('keeps the share button and hides the link while benefits are off', () => {
    expect(
      getReferralHomeFooter({
        ...LOADED_INVITE,
        isCompactHeader: true,
        isNative: true,
        benefitsEnabled: false,
      }),
    ).toEqual({ pinCrossLink: false, showShareButton: true });
  });

  it('does not pin the invite link before the summary is mounted', () => {
    expect(
      getReferralHomeFooter({
        ...LOADED_INVITE,
        isCompactHeader: true,
        isNative: true,
        inviteContentMounted: false,
        hasInviteUrl: false,
      }),
    ).toEqual({ pinCrossLink: false, showShareButton: false });
  });

  it('keeps the share button and hides the link while the invite skeleton is up', () => {
    expect(
      getReferralHomeFooter({
        ...LOADED_INVITE,
        isCompactHeader: true,
        isNative: true,
        inviteContentMounted: false,
      }),
    ).toEqual({ pinCrossLink: false, showShareButton: true });
  });

  it('pins the invite link without a share button when the url is missing', () => {
    expect(
      getReferralHomeFooter({
        ...LOADED_INVITE,
        isCompactHeader: true,
        isNative: true,
        hasInviteUrl: false,
      }),
    ).toEqual({ pinCrossLink: true, showShareButton: false });
  });
});
