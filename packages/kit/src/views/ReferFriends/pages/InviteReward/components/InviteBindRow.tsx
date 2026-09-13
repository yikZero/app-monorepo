import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import { Badge, Icon, SizableText, XStack, YStack } from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import {
  useFetchWalletsWithBoundStatus,
  useWalletBoundReferralCode,
} from '@onekeyhq/kit/src/views/ReferFriends/hooks/useWalletBoundReferralCode';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { ReferFriendsTestIDs } from '../../../testIDs';

import { getInviteBindRowKind } from './getInviteBindRowKind';

export function InviteBindRow() {
  const intl = useIntl();
  const { walletsWithStatus, refreshWalletsWithStatus } =
    useFetchWalletsWithBoundStatus();
  const { bindWalletInviteCode } = useWalletBoundReferralCode({
    entry: platformEnv.isNative ? 'modal' : 'tab',
  });
  const kind = getInviteBindRowKind(walletsWithStatus);
  const isBound = kind === 'bound';

  const handlePress = useCallback(() => {
    if (isBound) {
      return;
    }
    bindWalletInviteCode({
      onSuccess: () => {
        void refreshWalletsWithStatus();
      },
    });
  }, [bindWalletInviteCode, isBound, refreshWalletsWithStatus]);

  return (
    <ListItem
      testID={ReferFriendsTestIDs.inviteBindRow}
      mx="$0"
      px="$0"
      drillIn={!isBound}
      onPress={isBound ? undefined : handlePress}
    >
      <XStack p="$2" borderRadius="$3" bg="$bgSubdued">
        <Icon name="GiftOutline" size="$6" color="$icon" />
      </XStack>
      <YStack flex={1} gap="$0.5">
        <SizableText size="$bodyLgMedium">
          {intl.formatMessage({
            id: ETranslations.onboarding_invite_code_dialog_title,
          })}
        </SizableText>
        <SizableText size="$bodyMd" color="$textSubdued">
          {intl.formatMessage({
            id: isBound
              ? ETranslations.referral_wallet_bind_code_finish
              : ETranslations.referral_onboard_bind_code,
          })}
        </SizableText>
      </YStack>
      {isBound ? (
        <Badge badgeType="info" badgeSize="sm">
          <Badge.Text>
            {intl.formatMessage({
              id: ETranslations.referral_wallet_bind_code_finish,
            })}
          </Badge.Text>
        </Badge>
      ) : null}
    </ListItem>
  );
}
