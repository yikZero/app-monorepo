import { useCallback, useRef } from 'react';

import { useIntl } from 'react-intl';
import { StyleSheet } from 'react-native';

import {
  Badge,
  Icon,
  Page,
  SizableText,
  Stack,
  XStack,
  YStack,
  resetPrimeModal,
  resetToRoute,
  rootNavigationRef,
  useUpdateEffect,
} from '@onekeyhq/components';
import { AccountSelectorProviderMirror } from '@onekeyhq/kit/src/components/AccountSelector';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useOneKeyAuth } from '@onekeyhq/kit/src/components/OneKeyAuth/useOneKeyAuth';
import { useEditPrimeProfileDialog } from '@onekeyhq/kit/src/components/RenameDialog';
import { useReferFriends } from '@onekeyhq/kit/src/hooks/useReferFriends';
import { useRouteIsFocused } from '@onekeyhq/kit/src/hooks/useRouteIsFocused';
import { OneKeyIdAvatar } from '@onekeyhq/kit/src/views/Setting/pages/OneKeyId';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { EModalRoutes, ERootRoutes } from '@onekeyhq/shared/src/routes';
import { EPrimePages } from '@onekeyhq/shared/src/routes/prime';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import { usePrimeAvailable } from '../../hooks/usePrimeAvailable';
import { PrimeUserInfo } from '../PrimeDashboard/PrimeUserInfo';

function OneKeyIdPage() {
  const intl = useIntl();
  const { toInviteRewardPage } = useReferFriends();
  const { isPrimeAvailable } = usePrimeAvailable();
  const { isLoggedIn, logout, user } = useOneKeyAuth();
  const showEditPrimeProfileDialog = useEditPrimeProfileDialog();
  const logoutRef = useRef<() => Promise<void>>(logout);
  const isFocused = useRouteIsFocused();
  const isExplicitLogoutRef = useRef(false);

  const toPrimePage = useCallback(() => {
    requestIdleCallback(async () => {
      try {
        if (isPrimeAvailable) {
          if (platformEnv.isNative) {
            resetToRoute(ERootRoutes.iOSFullScreen, {
              screen: EModalRoutes.PrimeModal,
              params: {
                screen: EPrimePages.PrimeDashboard,
              },
            });
          } else {
            rootNavigationRef.current?.navigate(ERootRoutes.iOSFullScreen, {
              screen: EModalRoutes.PrimeModal,
              params: {
                screen: EPrimePages.PrimeDashboard,
              },
            });
          }
        }
      } catch (e) {
        defaultLogger.prime.subscription.onekeyIdLogout({
          reason: `OneKeyIdPage: toPrimePage navigation error: ${String(e)}`,
        });
      }
    });
  }, [isPrimeAvailable]);

  const handleLoggedOutWhileFocused = useCallback(async () => {
    if (isExplicitLogoutRef.current) {
      return;
    }
    if (!isLoggedIn && isFocused) {
      await timerUtils.wait(300);
      resetPrimeModal();
      defaultLogger.prime.subscription.onekeyIdLogout({
        reason:
          'OneKeyIdPage: is focused and primePersistAtom is not logged in',
      });
      void logoutRef.current();
    }
  }, [isLoggedIn, isFocused]);

  useUpdateEffect(() => {
    void handleLoggedOutWhileFocused();
  }, [handleLoggedOutWhileFocused]);

  const handleBeforeLogout = useCallback(() => {
    isExplicitLogoutRef.current = true;
  }, []);

  const handleLogoutSuccess = useCallback(async () => {
    defaultLogger.referral.page.logoutOneKeyIDResult();
    resetPrimeModal();
  }, []);

  return (
    <Page scrollEnabled>
      <Page.Header title="OneKey ID" />
      <Page.Body>
        <YStack>
          {isLoggedIn && user ? (
            <YStack
              p="$5"
              ai="center"
              jc="center"
              onPress={showEditPrimeProfileDialog}
              hoverStyle={{ bg: '$bgHover' }}
              pressStyle={{ bg: '$bgActive' }}
              borderRadius="$3"
              userSelect="none"
            >
              <Stack position="relative">
                <OneKeyIdAvatar size="$20" />
                <XStack
                  bg="$bg"
                  w={30}
                  h={30}
                  jc="center"
                  ai="center"
                  borderRadius="$full"
                  position="absolute"
                  borderWidth={StyleSheet.hairlineWidth}
                  borderColor="$bgApp"
                  right={0}
                  bottom={0}
                >
                  <Icon name="EditOutline" size="$4" color="$icon" />
                </XStack>
              </Stack>
              <SizableText pt="$5" pb="$2" size="$heading2xl" numberOfLines={1}>
                {user.nickname ?? 'OneKey ID'}
              </SizableText>
            </YStack>
          ) : null}
          <Stack p="$5">
            <PrimeUserInfo
              onBeforeLogout={handleBeforeLogout}
              onLogoutSuccess={handleLogoutSuccess}
            />
          </Stack>
          <YStack>
            {isPrimeAvailable ? (
              <ListItem
                userSelect="none"
                drillIn={isPrimeAvailable}
                renderAvatar={
                  <XStack
                    borderRadius="$3"
                    bg="$brand7"
                    w="$12"
                    h="$12"
                    ai="center"
                    jc="center"
                  >
                    <Icon name="PrimeSolid" color="$brand12" size="$6" />
                  </XStack>
                }
                title="OneKey Prime"
                subtitle={intl.formatMessage({
                  id: ETranslations.id_prime,
                })}
                onPress={toPrimePage}
              >
                {isPrimeAvailable ? null : (
                  <Badge badgeSize="sm">
                    <Badge.Text>
                      {intl.formatMessage({
                        id: ETranslations.id_prime_soon,
                      })}
                    </Badge.Text>
                  </Badge>
                )}
              </ListItem>
            ) : null}

            <ListItem
              drillIn
              userSelect="none"
              renderAvatar={
                <XStack
                  borderRadius="$3"
                  bg="$purple8"
                  w="$12"
                  h="$12"
                  ai="center"
                  jc="center"
                >
                  <Icon name="GiftSolid" color="$purple12" size="$6" />
                </XStack>
              }
              title={intl.formatMessage({
                id: ETranslations.id_refer_a_friend,
              })}
              subtitle={intl.formatMessage({
                id: ETranslations.id_refer_a_friend_desc,
              })}
              onPress={toInviteRewardPage}
            />
          </YStack>
        </YStack>
      </Page.Body>
    </Page>
  );
}

export default function OneKeyId() {
  return (
    <AccountSelectorProviderMirror
      config={{
        sceneName: EAccountSelectorSceneName.home,
        sceneUrl: '',
      }}
      enabledNum={[0]}
    >
      <OneKeyIdPage />
    </AccountSelectorProviderMirror>
  );
}
