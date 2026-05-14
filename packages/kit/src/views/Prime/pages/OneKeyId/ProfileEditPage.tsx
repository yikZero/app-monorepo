import { memo, useCallback, useMemo } from 'react';

import { useIntl } from 'react-intl';

import type { UseFormReturn } from '@onekeyhq/components';
import {
  Form,
  Icon,
  Image,
  ImageCrop,
  Input,
  Page,
  Stack,
  Toast,
  XStack,
  YStack,
  useForm,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useOneKeyAuth } from '@onekeyhq/kit/src/components/OneKeyAuth/useOneKeyAuth';
import { OneKeyIdFallbackAvatar } from '@onekeyhq/kit/src/components/OneKeyIdAvatar';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { PrimeTestIDs } from '../../testIDs';

interface IPrimeProfileFormValues {
  avatar: string | undefined;
  nickname: string | undefined;
}

const normalizeNickname = (nickname?: string) => nickname?.trim() || '';
const IMAGE_PICKER_CANCELLED_CODE = 'E_PICKER_CANCELLED';

function isImagePickerCancelled(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === IMAGE_PICKER_CANCELLED_CODE
  );
}

function ProfileEditPage() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const { user } = useOneKeyAuth();

  const formOption = useMemo(
    () => ({
      defaultValues: {
        avatar: user?.avatar,
        nickname: user?.nickname,
      },
      onSubmit: async (
        formInstance: UseFormReturn<IPrimeProfileFormValues>,
      ) => {
        const formValues = formInstance.getValues();
        const nickname = normalizeNickname(formValues.nickname);
        if (!nickname) {
          return;
        }

        try {
          const success =
            await backgroundApiProxy.servicePrime.updatePrimeUserProfile({
              avatar: formValues.avatar ?? '',
              nickname,
            });

          if (!success) {
            Toast.error({
              title: intl.formatMessage({
                id: ETranslations.global_update_failed,
              }),
            });
            return;
          }

          Toast.success({
            title: intl.formatMessage({
              id: ETranslations.feedback_change_saved,
            }),
          });
          navigation.pop();
        } catch {
          Toast.error({
            title: intl.formatMessage({
              id: ETranslations.global_update_failed,
            }),
          });
        }
      },
    }),
    [intl, navigation, user?.avatar, user?.nickname],
  );

  const form = useForm<IPrimeProfileFormValues>(formOption);
  const userAvatar = form.watch('avatar');
  const nicknameLength = form.watch('nickname')?.length || 0;

  const handlePickAvatar = useCallback(async () => {
    try {
      const image = await ImageCrop.openPicker({
        width: 240,
        height: 240,
        compressImageQuality: 0.8,
      });
      if (image.data) {
        form.setValue('avatar', image.data, { shouldDirty: true });
      }
    } catch (error) {
      if (isImagePickerCancelled(error)) {
        return;
      }
      Toast.error({
        title: intl.formatMessage({
          id: ETranslations.global_update_failed,
        }),
      });
    }
  }, [form, intl]);

  const handleSave = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) {
      return;
    }
    await form.submit?.();
  }, [form]);

  return (
    <Page>
      <Page.Header
        title={intl.formatMessage({ id: ETranslations.settings_edit_profile })}
      />
      <Page.Body>
        <YStack flex={1} p="$5" gap="$6">
          <Form form={form}>
            <YStack gap="$6">
              <XStack jc="center">
                <Stack position="relative" onPress={handlePickAvatar}>
                  <Image
                    size="$20"
                    borderRadius="$full"
                    borderWidth={1}
                    borderColor="$neutral3"
                    source={userAvatar ? { uri: userAvatar } : undefined}
                    fallback={<OneKeyIdFallbackAvatar size="$20" />}
                  />
                  <XStack
                    bg="$bg"
                    w={30}
                    h={30}
                    jc="center"
                    ai="center"
                    borderRadius="$full"
                    position="absolute"
                    borderWidth={1}
                    borderColor="$bgApp"
                    right={0}
                    bottom={0}
                  >
                    <Icon name="EditOutline" size="$4" color="$icon" />
                  </XStack>
                </Stack>
              </XStack>
              <Form.Field
                label={intl.formatMessage({
                  id: ETranslations.settings_nickname,
                })}
                name="nickname"
                rules={{
                  validate: (value: string) => {
                    if (!normalizeNickname(value)) {
                      return intl.formatMessage({
                        id: ETranslations.form_rename_error_empty,
                      });
                    }
                    return true;
                  },
                }}
              >
                <Input
                  size="large"
                  $gtMd={{ size: 'medium' }}
                  maxLength={20}
                  autoFocus
                  flex={1}
                  testID={PrimeTestIDs.oneKeyIdProfileNicknameInput}
                  addOns={[
                    {
                      label: `${nicknameLength}/20`,
                    },
                  ]}
                />
              </Form.Field>
            </YStack>
          </Form>
        </YStack>
      </Page.Body>
      <Page.Footer>
        <Page.FooterActions
          onConfirmText={intl.formatMessage({ id: ETranslations.action_save })}
          onConfirm={() => {
            void handleSave();
          }}
          confirmButtonProps={{
            loading: form.formState.isSubmitting,
            testID: PrimeTestIDs.oneKeyIdProfileSaveBtn,
          }}
        />
      </Page.Footer>
    </Page>
  );
}

export default memo(ProfileEditPage);
