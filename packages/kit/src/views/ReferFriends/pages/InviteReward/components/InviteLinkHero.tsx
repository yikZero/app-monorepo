import type { ReactNode } from 'react';

import { useIntl } from 'react-intl';

import {
  Button,
  Icon,
  IconButton,
  SizableText,
  XStack,
  YStack,
  useMedia,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { ReferFriendsTestIDs } from '../../../testIDs';

import { getInviteLayoutCopy } from './getInviteLayoutCopy';
import { InviteReferAnimation } from './InviteReferAnimation';
import { InviteValueLine } from './InviteValueLine';
import { useReferralCodeCard } from './ReferralCodeCard/hooks/useReferralCodeCard';
import { ReferralLinkDropdown } from './ReferralLinkDropdown';

import type { ICurrentLevelCardProps } from './CurrentLevelCard/types';

function InviteLinkField({
  inviteUrl,
  displayUrl,
}: {
  inviteUrl: string;
  displayUrl: string;
}) {
  return (
    <XStack
      flex={1}
      minHeight={44}
      ai="center"
      gap="$2"
      px="$3"
      borderRadius="$2"
      borderWidth={1}
      borderColor="$borderSubdued"
      bg="$bgStrong"
    >
      <SizableText flex={1} numberOfLines={1} size="$bodyMd">
        {displayUrl}
      </SizableText>
      <ReferralLinkDropdown inviteUrl={inviteUrl} />
    </XStack>
  );
}

function InviteCodeLine({
  inviteCode,
  codeLabel,
  manageLabel,
  showManageLabel,
  onCopy,
  onManage,
}: {
  inviteCode: string;
  codeLabel: string;
  manageLabel: string;
  showManageLabel: boolean;
  onCopy: () => void;
  onManage: () => void;
}) {
  return (
    <XStack ai="center" minHeight={32} gap="$2">
      <XStack
        testID={ReferFriendsTestIDs.inviteCodeLine}
        flex={1}
        ai="center"
        gap="$2"
        cursor="pointer"
        onPress={onCopy}
      >
        <SizableText size="$bodyMd" color="$textSubdued">
          {codeLabel}
        </SizableText>
        <SizableText size="$bodyMdMedium" numberOfLines={1} flexShrink={1}>
          {inviteCode}
        </SizableText>
        <Icon name="Copy3Outline" size="$4" color="$iconSubdued" />
      </XStack>
      <XStack
        testID={ReferFriendsTestIDs.inviteManageCodes}
        ai="center"
        gap="$0.5"
        cursor="pointer"
        onPress={onManage}
      >
        {showManageLabel ? (
          <SizableText size="$bodyMd" color="$textSubdued">
            {manageLabel}
          </SizableText>
        ) : null}
        <Icon name="ChevronRightSmallOutline" size="$5" color="$iconSubdued" />
      </XStack>
    </XStack>
  );
}

function InviteLinkActions({
  inviteUrl,
  displayUrl,
  copyLabel,
  copyLink,
  shareButton,
  isCompact,
}: {
  inviteUrl: string;
  displayUrl: string;
  copyLabel: string;
  copyLink: () => void;
  shareButton: ReactNode;
  isCompact: boolean;
}) {
  const linkField = (
    <InviteLinkField inviteUrl={inviteUrl} displayUrl={displayUrl} />
  );
  const copyButton = (
    <Button
      flex={isCompact ? 1 : undefined}
      variant="primary"
      size="medium"
      onPress={copyLink}
      testID={ReferFriendsTestIDs.copyLinkBtn}
    >
      {copyLabel}
    </Button>
  );

  if (isCompact) {
    return (
      <YStack gap="$2">
        {linkField}
        <XStack ai="center" gap="$2">
          {copyButton}
          {shareButton}
        </XStack>
      </YStack>
    );
  }

  return (
    <XStack ai="center" gap="$2">
      {linkField}
      {copyButton}
      {shareButton}
    </XStack>
  );
}

export function InviteLinkHero({
  inviteUrl,
  inviteCode,
  onToggleManageCodes,
  ...levelProps
}: ICurrentLevelCardProps & {
  inviteUrl: string;
  inviteCode: string;
  onToggleManageCodes: () => void;
}) {
  const intl = useIntl();
  const { md } = useMedia();
  const copy = getInviteLayoutCopy(intl.locale);
  const { handleCopy, copyLink, handleShare, inviteCodeUrl } =
    useReferralCodeCard({
      inviteUrl,
      inviteCode,
    });

  return (
    <YStack gap="$2">
      <InviteReferAnimation />
      <YStack gap="$1">
        <SizableText size="$headingLg">{copy.headline}</SizableText>
        <InviteValueLine {...levelProps} />
      </YStack>
      <InviteLinkActions
        inviteUrl={inviteUrl}
        displayUrl={inviteCodeUrl}
        copyLabel={copy.copyInviteLink}
        copyLink={copyLink}
        isCompact={md}
        shareButton={
          platformEnv.isNative ? (
            <IconButton
              testID={ReferFriendsTestIDs.inviteShareBtn}
              variant="secondary"
              icon="ShareOutline"
              title={intl.formatMessage({ id: ETranslations.explore_share })}
              onPress={handleShare}
            />
          ) : null
        }
      />
      <InviteCodeLine
        inviteCode={inviteCode}
        codeLabel={intl.formatMessage({
          id: ETranslations.referral_your_code,
        })}
        manageLabel={copy.manageCodes}
        showManageLabel={!md}
        onCopy={handleCopy}
        onManage={onToggleManageCodes}
      />
    </YStack>
  );
}
