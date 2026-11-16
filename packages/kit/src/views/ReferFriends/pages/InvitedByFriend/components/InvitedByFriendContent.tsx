import { Icon, SizableText, XStack, YStack } from '@onekeyhq/components';

import { useInvitePostConfig } from '../../../hooks/useInvitePostConfig';
import {
  formatInviteeDiscountFromConfig,
  isInviteeDiscountDeclined,
} from '../../../utils';

function InvitedByFriendContent({ referralCode }: { referralCode?: string }) {
  const { postConfig, isSettled } = useInvitePostConfig();
  const inviteeDiscountAmount = formatInviteeDiscountFromConfig(
    postConfig?.inviteeDiscount,
  );
  // A zero rate means the server has paused the invitee rebate, so promise
  // none rather than render "0%". Held back until the config has answered,
  // so a first open never shows the default rate and then swaps it.
  const showRebate =
    isSettled && !isInviteeDiscountDeclined(postConfig?.inviteeDiscount);

  return (
    <YStack px="$5" pt="$5" gap="$5">
      <YStack gap="$2" alignItems="flex-start">
        <SizableText size="$heading2xl">You’ve been invited</SizableText>
        {referralCode ? (
          <XStack
            bg="$bgStrong"
            borderRadius="$full"
            px="$2.5"
            py="$1"
            gap="$1.5"
            alignItems="center"
          >
            <SizableText size="$bodyMdMedium" color="$textSubdued">
              {`Referral code ${referralCode}`}
            </SizableText>
          </XStack>
        ) : null}
      </YStack>
      {showRebate ? (
        <XStack gap="$3" alignItems="flex-start">
          <Icon name="GiftOutline" color="$iconSubdued" size="$6" />
          <YStack flex={1} gap="$0.5">
            <SizableText size="$bodyLgMedium">
              {`Get ${inviteeDiscountAmount} back on trading fees`}
            </SizableText>
            <SizableText size="$bodyMd" color="$textSubdued">
              Rate varies by service
            </SizableText>
          </YStack>
        </XStack>
      ) : null}
    </YStack>
  );
}

export { InvitedByFriendContent };
