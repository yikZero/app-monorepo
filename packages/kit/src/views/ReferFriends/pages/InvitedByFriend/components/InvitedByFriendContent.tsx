import {
  Icon,
  SizableText,
  Skeleton,
  XStack,
  YStack,
} from '@onekeyhq/components';

import { useInvitePostConfig } from '../../../hooks/useInvitePostConfig';
import {
  formatInviteeDiscountFromConfig,
  isInviteeDiscountDeclined,
} from '../../../utils';

const HEADLINE_SIZE = {
  size: '$heading3xl',
  $gtMd: { size: '$heading2xl' },
} as const;

function CodePill({ referralCode }: { referralCode: string }) {
  return (
    <XStack
      ai="center"
      gap="$1.5"
      px="$3"
      py="$1.5"
      borderRadius="$full"
      bg="$bgSubdued"
      borderWidth={1}
      borderColor="$borderSubdued"
    >
      <Icon name="TicketOutline" size="$4" color="$iconSubdued" />
      <SizableText size="$bodyMdMedium" color="$textSubdued">
        {`Referral code ${referralCode}`}
      </SizableText>
    </XStack>
  );
}

function InvitedByFriendContent({ referralCode }: { referralCode?: string }) {
  const { postConfig, isSettled } = useInvitePostConfig();
  const inviteeDiscountAmount = formatInviteeDiscountFromConfig(
    postConfig?.inviteeDiscount,
  );
  // A zero rate means the server has paused the invitee rebate, so promise
  // none rather than render "0%".
  const isRebateDeclined = isInviteeDiscountDeclined(
    postConfig?.inviteeDiscount,
  );

  let hero;
  if (!isSettled) {
    // Held until the config answers, so a first open never shows the
    // default rate and then swaps it for the server's.
    hero = (
      <>
        <Skeleton.BodyLg width={140} />
        <Skeleton.HeadingXl width={260} />
        <Skeleton.BodyMd width={160} />
      </>
    );
  } else if (isRebateDeclined) {
    hero = (
      <SizableText {...HEADLINE_SIZE} textAlign="center">
        You’ve been invited
      </SizableText>
    );
  } else {
    hero = (
      <>
        <SizableText size="$bodyLgMedium" color="$textSubdued">
          You’ve been invited
        </SizableText>
        <SizableText {...HEADLINE_SIZE} textAlign="center">
          Get{' '}
          <SizableText {...HEADLINE_SIZE} color="$textSuccess">
            {inviteeDiscountAmount}
          </SizableText>{' '}
          back on trading fees
        </SizableText>
        <SizableText size="$bodyMd" color="$textSubdued" textAlign="center">
          Rate varies by service
        </SizableText>
      </>
    );
  }

  return (
    <YStack ai="center" gap="$5" px="$5">
      <YStack ai="center" gap="$2" maxWidth={400}>
        {hero}
      </YStack>
      {referralCode ? <CodePill referralCode={referralCode} /> : null}
    </YStack>
  );
}

export { InvitedByFriendContent };
