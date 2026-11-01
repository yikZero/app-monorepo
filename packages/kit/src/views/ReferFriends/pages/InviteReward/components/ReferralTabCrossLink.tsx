import { Icon, Page, SizableText, XStack, YStack } from '@onekeyhq/components';
import type { IPageProps } from '@onekeyhq/components';

import { INVITE_CARD_BORDER_COLOR } from './useInviteCardStyle';

// A quiet line at the end of each tab pointing to the other one, so the two
// read as the two sides of referrals rather than two versions of one page.
export function ReferralTabCrossLink({
  prompt,
  action,
  onPress,
  testID,
  pinned = false,
  pt,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
  testID: string;
  // Compact layouts render this in the page footer, so it stays put.
  pinned?: boolean;
  // Space above the line. The flow default separates it from tab content.
  pt?: '$8' | '$3';
}) {
  return (
    <XStack
      px="$pagePadding"
      pt={pt ?? (pinned ? '$3' : '$8')}
      // In a page-filling column this pushes the line to the bottom of a
      // short page. Once that page scrolls, the line stays after the content.
      mt={pinned ? undefined : 'auto'}
      jc="center"
      ai="center"
      gap="$1.5"
      flexWrap="wrap"
    >
      <SizableText size="$bodyMd" color="$textSubdued">
        {prompt}
      </SizableText>
      <XStack
        testID={testID}
        ai="center"
        gap="$1"
        role="button"
        cursor="default"
        // A text link: feedback dims the text instead of filling a surface
        // around it, and the slop gives it a 44px touch target.
        hoverStyle={{ opacity: 0.8 }}
        pressStyle={{ opacity: 0.6 }}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        onPress={onPress}
      >
        <SizableText size="$bodyMdMedium" color="$textInteractive">
          {action}
        </SizableText>
        <Icon name="ArrowRightOutline" size="$4" color="$textInteractive" />
      </XStack>
    </XStack>
  );
}

// Link-only footer. The invite share button uses the same bar with the
// button added, so this helper stays free of that action.
export function PinnedReferralCrossLinkFooter({
  prompt,
  action,
  onPress,
  testID,
  backgroundColor,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
  testID: string;
  backgroundColor: IPageProps['backgroundColor'];
}) {
  return (
    <Page.Footer>
      <YStack
        bg={backgroundColor}
        borderTopWidth={1}
        borderTopColor={INVITE_CARD_BORDER_COLOR}
        pb="$4"
      >
        <ReferralTabCrossLink
          pinned
          prompt={prompt}
          action={action}
          onPress={onPress}
          testID={testID}
        />
      </YStack>
    </Page.Footer>
  );
}
