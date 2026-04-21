import { useCallback, useState } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Alert,
  Divider,
  Icon,
  Page,
  SizableText,
  XStack,
  YStack,
} from '@onekeyhq/components';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalReferFriendsRoutes } from '@onekeyhq/shared/src/routes';
import type { IBtcRewardCodeInfoParam } from '@onekeyhq/shared/src/routes';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';

import { mockSubmitRedemption } from '../../mockData';
import { formatUsd } from '../../utils';

import type { RouteProp } from '@react-navigation/core';

type IRouteParams = RouteProp<
  {
    BtcRewardConfirm: {
      codeInfo: IBtcRewardCodeInfoParam;
      orderId?: string;
      productName?: string;
      address: string;
      addressLabel: string;
    };
  },
  'BtcRewardConfirm'
>;

function ConfirmRedeemPage() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const route = useRoute<IRouteParams>();
  const { codeInfo, orderId, productName, address, addressLabel } =
    route.params;
  const { code, modelName, usdAmount, estimatedBtcAmount, btcPrice } = codeInfo;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await mockSubmitRedemption({
        code,
        orderId,
        address,
      });

      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      navigation.push(EModalReferFriendsRoutes.BtcRewardSuccess, {
        usdAmount,
        estimatedBtcAmount,
        address,
      });
    } catch {
      setSubmitError(
        intl.formatMessage({
          id: ETranslations.redemption_btc_confirm_error_desc,
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [navigation, code, orderId, address, usdAmount, estimatedBtcAmount, intl]);

  const handleChangeAddress = useCallback(() => {
    navigation.pop();
  }, [navigation]);

  return (
    <Page scrollEnabled>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.redemption_btc_confirm_title,
        })}
      />
      <Page.Body px="$5" py="$4">
        <YStack gap="$4">
          <YStack alignItems="center" py="$4" gap="$1">
            <SizableText size="$headingXl" color="$textSubdued">
              {intl.formatMessage({
                id: ETranslations.redemption_btc_confirm_you_will_receive,
              })}
            </SizableText>
            <SizableText size="$heading4xl" color="$text">
              {formatUsd(usdAmount)}
            </SizableText>
            <SizableText size="$bodyMd" color="$textSubdued">
              {intl.formatMessage(
                { id: ETranslations.redemption_btc_amount_on_base },
                { amount: estimatedBtcAmount },
              )}
            </SizableText>
          </YStack>

          <YStack bg="$bgSubdued" borderRadius="$3" p="$4" gap="$2.5">
            {orderId ? (
              <XStack justifyContent="space-between">
                <SizableText size="$bodyMd" color="$textSubdued">
                  {intl.formatMessage({
                    id: ETranslations.Limit_order_history_order_id,
                  })}
                </SizableText>
                <SizableText size="$bodyMdMedium">{orderId}</SizableText>
              </XStack>
            ) : null}

            <XStack justifyContent="space-between">
              <SizableText size="$bodyMd" color="$textSubdued">
                {intl.formatMessage({
                  id: ETranslations.redemption_btc_label_product,
                })}
              </SizableText>
              <SizableText size="$bodyMdMedium">
                {productName ?? modelName}
              </SizableText>
            </XStack>

            <XStack justifyContent="space-between">
              <SizableText size="$bodyMd" color="$textSubdued">
                {intl.formatMessage({
                  id: ETranslations.redemption_btc_label_btc_price,
                })}
              </SizableText>
              <SizableText size="$bodyMd" color="$textSubdued">
                {formatUsd(btcPrice)}
              </SizableText>
            </XStack>

            <Divider />

            <XStack
              gap="$2"
              alignItems="center"
              onPress={handleChangeAddress}
              pressStyle={{ opacity: 0.7 }}
              cursor="pointer"
            >
              <Icon name="WalletCryptoSolid" size="$5" color="$icon" />
              <YStack flex={1}>
                <SizableText size="$bodyMdMedium">{addressLabel}</SizableText>
                <SizableText size="$bodySm" color="$textSubdued">
                  {accountUtils.shortenAddress({ address })}
                </SizableText>
              </YStack>
              <XStack gap="$1" alignItems="center">
                <SizableText size="$bodySmMedium" color="$textInfo">
                  {intl.formatMessage({
                    id: ETranslations.redemption_btc_confirm_change_address,
                  })}
                </SizableText>
                <Icon
                  name="ChevronRightSmallOutline"
                  size="$4"
                  color="$iconInfo"
                />
              </XStack>
            </XStack>
          </YStack>

          <Alert
            type="info"
            icon="ClockTimeHistoryOutline"
            title={intl.formatMessage({
              id: ETranslations.redemption_btc_confirm_alert_title,
            })}
            description={intl.formatMessage({
              id: ETranslations.redemption_btc_confirm_alert_desc,
            })}
          />

          {submitError ? (
            <Alert
              type="critical"
              title={intl.formatMessage({
                id: ETranslations.redemption_btc_confirm_error_title,
              })}
              description={submitError}
            />
          ) : null}
        </YStack>
      </Page.Body>

      <Page.Footer
        onConfirm={handleSubmit}
        onConfirmText={intl.formatMessage({
          id: ETranslations.redemption_btc_confirm_submit,
        })}
        confirmButtonProps={{
          loading: isSubmitting,
          disabled: isSubmitting,
        }}
      />
    </Page>
  );
}

export default ConfirmRedeemPage;
