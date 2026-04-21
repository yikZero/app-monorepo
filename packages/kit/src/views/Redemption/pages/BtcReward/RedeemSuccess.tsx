import { useCallback } from 'react';

import { CommonActions, useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Alert,
  Icon,
  Page,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalReferFriendsRoutes } from '@onekeyhq/shared/src/routes';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';

import { formatUsd } from '../../utils';

import type { RouteProp } from '@react-navigation/core';

type IRouteParams = RouteProp<
  {
    BtcRewardSuccess: {
      usdAmount: number;
      estimatedBtcAmount: string;
      address: string;
    };
  },
  'BtcRewardSuccess'
>;

function RedeemSuccessPage() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const route = useRoute<IRouteParams>();
  const { usdAmount, estimatedBtcAmount, address } = route.params;

  const handleViewHistory = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: EModalReferFriendsRoutes.RedemptionHistory }],
      }),
    );
  }, [navigation]);

  const handleDone = useCallback(() => {
    navigation.popStack();
  }, [navigation]);

  return (
    <Page scrollEnabled>
      <Page.Header
        title={intl.formatMessage({ id: ETranslations.global_success })}
      />
      <Page.Body px="$5" py="$8">
        <YStack alignItems="center" gap="$6" pt="$6">
          <Stack
            bg="$bgSuccessStrong"
            borderRadius="$full"
            p="$5"
            alignItems="center"
            justifyContent="center"
          >
            <Icon name="CheckLargeOutline" size="$12" color="$iconInverse" />
          </Stack>

          <YStack alignItems="center" gap="$2">
            <SizableText size="$headingXl" textAlign="center">
              {intl.formatMessage({
                id: ETranslations.redemption_btc_success_title,
              })}
            </SizableText>
            <SizableText size="$bodyLg" color="$textSubdued" textAlign="center">
              {intl.formatMessage({
                id: ETranslations.redemption_btc_success_description,
              })}
            </SizableText>
          </YStack>

          <YStack bg="$bgSubdued" borderRadius="$3" p="$4" w="100%" gap="$3">
            <XStack justifyContent="space-between">
              <SizableText size="$bodyMd" color="$textSubdued">
                {intl.formatMessage({
                  id: ETranslations.referral_order_reward,
                })}
              </SizableText>
              <SizableText size="$bodyMdMedium">
                {intl.formatMessage(
                  { id: ETranslations.redemption_btc_success_reward_value },
                  { amount: estimatedBtcAmount, usd: formatUsd(usdAmount) },
                )}
              </SizableText>
            </XStack>

            <XStack justifyContent="space-between">
              <SizableText size="$bodyMd" color="$textSubdued">
                {intl.formatMessage({ id: ETranslations.global_network })}
              </SizableText>
              <SizableText size="$bodyMdMedium">Base</SizableText>
            </XStack>

            <XStack justifyContent="space-between">
              <SizableText size="$bodyMd" color="$textSubdued">
                {intl.formatMessage({
                  id: ETranslations.redemption_btc_success_label_to_address,
                })}
              </SizableText>
              <SizableText size="$bodyMdMedium">
                {accountUtils.shortenAddress({ address })}
              </SizableText>
            </XStack>
          </YStack>

          <Alert
            type="warning"
            icon="ClockTimeHistoryOutline"
            description={intl.formatMessage({
              id: ETranslations.redemption_btc_success_alert_desc,
            })}
          />
        </YStack>
      </Page.Body>

      <Page.Footer
        onConfirm={handleViewHistory}
        onConfirmText={intl.formatMessage({
          id: ETranslations.redemption_btc_success_view_history,
        })}
        onCancel={handleDone}
        onCancelText={intl.formatMessage({ id: ETranslations.global_done })}
      />
    </Page>
  );
}

export default RedeemSuccessPage;
