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
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalReferFriendsRoutes } from '@onekeyhq/shared/src/routes';
import type { IBtcRewardCodeInfoParam } from '@onekeyhq/shared/src/routes';

import { mockVerifyOrder } from '../../mockData';

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
  orderId: string;
}

const EXAMPLE_ORDER_ID = 'ORD-2025-00123';

function VerifyOrderPage() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const route = useRoute<IRouteParams>();
  const { codeInfo } = route.params;

  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<IFormValues>({
    defaultValues: { orderId: '' },
    mode: 'onChange',
  });

  const orderIdValue = form.watch('orderId');

  const handleVerify = useCallback(async () => {
    const orderId = form.getValues('orderId').trim();
    if (!orderId) return;

    setIsVerifying(true);
    form.clearErrors('orderId');

    try {
      const result = await mockVerifyOrder(orderId);
      if (!result.success) {
        form.setError('orderId', { message: result.error });
        return;
      }

      navigation.push(EModalReferFriendsRoutes.BtcRewardSelectAddress, {
        codeInfo,
        orderId: result.data.orderId,
        productName: result.data.productName,
      });
    } finally {
      setIsVerifying(false);
    }
  }, [form, navigation, codeInfo]);

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
              name="orderId"
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
            <Icon name="QuestionmarkOutline" size="$4" color="$iconSubdued" />
            <YStack flex={1} gap="$1">
              <SizableText size="$bodySmMedium">
                {intl.formatMessage({
                  id: ETranslations.redemption_btc_verify_order_hint_title,
                })}
              </SizableText>
              <SizableText size="$bodySm" color="$textSubdued">
                {intl.formatMessage({
                  id: ETranslations.redemption_btc_verify_order_hint_description,
                })}
              </SizableText>
            </YStack>
          </XStack>

          {__DEV__ ? (
            <YStack bg="$bgSubdued" borderRadius="$3" p="$3">
              <SizableText size="$bodySm" color="$textSubdued">
                Demo: Try "ORD-2025-00123", "ORD-2025-00456", "ORD-2025-00789",
                or "ORD-REFUND-001"
              </SizableText>
            </YStack>
          ) : null}
        </YStack>
      </Page.Body>

      <Page.Footer
        onConfirm={handleVerify}
        onConfirmText={intl.formatMessage({
          id: ETranslations.redemption_btc_verify_order_submit,
        })}
        confirmButtonProps={{
          disabled: !orderIdValue?.trim() || isVerifying,
          loading: isVerifying,
        }}
      />
    </Page>
  );
}

export default VerifyOrderPage;
