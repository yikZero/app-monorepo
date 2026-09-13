import { useIntl } from 'react-intl';

import {
  Button,
  IconButton,
  SizableText,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { ReferFriendsTestIDs } from '../../../testIDs';

import { useReferralCodeCard } from './ReferralCodeCard/hooks/useReferralCodeCard';
import { ReferralLinkDropdown } from './ReferralLinkDropdown';

export function InviteCodeHero({
  inviteUrl,
  inviteCode,
}: {
  inviteUrl: string;
  inviteCode: string;
}) {
  const intl = useIntl();
  const { handleCopy, copyLink, handleShare } = useReferralCodeCard({
    inviteUrl,
    inviteCode,
  });

  return (
    <YStack bg="$bgSubdued" borderRadius="$3" p="$4" gap="$4">
      <YStack
        role="button"
        userSelect="none"
        cursor="pointer"
        onPress={handleCopy}
      >
        <SizableText size="$bodySmMedium" color="$textSubdued">
          {intl.formatMessage({ id: ETranslations.referral_your_code })}
        </SizableText>
        <SizableText size="$headingXl" color="$text">
          {inviteCode}
        </SizableText>
      </YStack>

      <XStack ai="center" gap="$2">
        <Button
          flex={1}
          variant="primary"
          size="medium"
          onPress={copyLink}
          testID={ReferFriendsTestIDs.copyLinkBtn}
        >
          {intl.formatMessage({ id: ETranslations.browser_copy_link })}
        </Button>
        {platformEnv.isNative ? (
          <IconButton
            testID={ReferFriendsTestIDs.inviteShareBtn}
            variant="secondary"
            icon="ShareOutline"
            title={intl.formatMessage({ id: ETranslations.explore_share })}
            onPress={handleShare}
          />
        ) : null}
        <ReferralLinkDropdown inviteUrl={inviteUrl} />
      </XStack>
    </YStack>
  );
}
