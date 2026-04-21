import { useCallback, useState } from 'react';

import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Form,
  Icon,
  Input,
  Page,
  SizableText,
  XStack,
  YStack,
  useForm,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalReferFriendsRoutes } from '@onekeyhq/shared/src/routes';
import type { IBtcRewardCodeInfoParam } from '@onekeyhq/shared/src/routes';

import type { RouteProp } from '@react-navigation/core';

type IRouteParams = RouteProp<
  {
    BtcRewardVerifyOrder: {
      codeInfo: IBtcRewardCodeInfoParam;
    };
  },
  'BtcRewardVerifyOrder'
>;

interface IFormValues {
  shopifyOrderNumber: string;
}

const EXAMPLE_ORDER_ID = '#1001';

function VerifyOrderPage() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const route = useRoute<IRouteParams>();
  const { codeInfo } = route.params;

  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<IFormValues>({
    defaultValues: { shopifyOrderNumber: '' },
    mode: 'onChange',
  });

  const orderNumberValue = form.watch('shopifyOrderNumber');

  const handleVerify = useCallback(async () => {
    const shopifyOrderNumber = form.getValues('shopifyOrderNumber').trim();
    if (!shopifyOrderNumber) return;

    setIsVerifying(true);
    form.clearErrors('shopifyOrderNumber');

    try {
      const result =
        await backgroundApiProxy.serviceReferralCode.btcRewardVerifyOrder({
          codeId: codeInfo.codeId,
          shopifyOrderNumber,
        });
      if (!result.success) {
        form.setError('shopifyOrderNumber', { message: result.error.message });
        return;
      }

      navigation.push(EModalReferFriendsRoutes.BtcRewardSelectAddress, {
        codeInfo,
        shopifyOrderNumber: result.data.orderSummary.orderNumber,
        displayTitle: result.data.orderSummary.displayTitle,
        quotaRemaining: result.data.quotaRemaining,
      });
    } catch {
      form.setError('shopifyOrderNumber', {
        message: intl.formatMessage({
          id: ETranslations.redemption_btc_confirm_error_desc,
        }),
      });
    } finally {
      setIsVerifying(false);
    }
  }, [form, navigation, codeInfo, intl]);

  return (
    <Page scrollEnabled>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.redemption_btc_verify_order_title,
        })}
      />
      <Page.Body px="$5" py="$4">
        <YStack gap="$4">
          <SizableText size="$bodyMd" color="$textSubdued">
            {intl.formatMessage({
              id: ETranslations.redemption_btc_verify_order_description,
            })}
          </SizableText>

          <Form form={form}>
            <Form.Field
              name="shopifyOrderNumber"
              label={intl.formatMessage({
                id: ETranslations.redemption_btc_verify_order_input_label,
              })}
            >
              <Input
                size="large"
                placeholder={intl.formatMessage(
                  {
                    id: ETranslations.redemption_btc_verify_order_input_placeholder,
                  },
                  { example: EXAMPLE_ORDER_ID },
                )}
                autoCorrect={false}
              />
            </Form.Field>
          </Form>

          <XStack bg="$bgSubdued" borderRadius="$3" p="$3" gap="$2">
            <Icon name="QuestionmarkOutline" size="$5" color="$iconSubdued" />
            <YStack flex={1} gap="$1">
              <SizableText size="$bodyMdMedium">
                {intl.formatMessage({
                  id: ETranslations.redemption_btc_verify_order_hint_title,
                })}
              </SizableText>
              <SizableText size="$bodyMd" color="$textSubdued">
                {intl.formatMessage({
                  id: ETranslations.redemption_btc_verify_order_hint_description,
                })}
              </SizableText>
            </YStack>
          </XStack>
        </YStack>
      </Page.Body>

      <Page.Footer
        onConfirm={handleVerify}
        onConfirmText={intl.formatMessage({
          id: ETranslations.redemption_btc_verify_order_submit,
        })}
        confirmButtonProps={{
          disabled: !orderNumberValue?.trim() || isVerifying,
          loading: isVerifying,
        }}
      />
    </Page>
  );
}

export default VerifyOrderPage;
