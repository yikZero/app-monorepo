import { useRoute } from '@react-navigation/core';

import { Page, YStack } from '@onekeyhq/components';
import { AccountSelectorProviderMirror } from '@onekeyhq/kit/src/components/AccountSelector';
import type {
  EModalReferFriendsRoutes,
  IModalReferFriendsParamList,
} from '@onekeyhq/shared/src/routes';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import { ReferFriendsPageContainer } from '../../components';

import {
  InvitedByFriendActions,
  InvitedByFriendContent,
  InvitedByFriendImage,
} from './components';

import type { RouteProp } from '@react-navigation/native';

// Lets the body fill the viewport so its content can center vertically.
const SCROLL_PROPS = {
  showsVerticalScrollIndicator: false,
  contentContainerStyle: { flexGrow: 1 },
};

function InvitedByFriendPage() {
  const route =
    useRoute<
      RouteProp<
        IModalReferFriendsParamList,
        EModalReferFriendsRoutes.InvitedByFriend
      >
    >();

  const referralCode = route.params?.code ?? '';
  const page = route.params?.page;

  return (
    <Page scrollEnabled scrollProps={SCROLL_PROPS}>
      {/* The hero names the page; the header only carries close. */}
      <Page.Header title="" />
      <Page.Body>
        <ReferFriendsPageContainer flex={1}>
          {/* Centered in the space above the footer, so tall phones split
              the slack above and below instead of leaving one gap. */}
          <YStack flex={1} jc="center" gap="$6" py="$5">
            <InvitedByFriendImage />
            <InvitedByFriendContent referralCode={referralCode} />
          </YStack>
        </ReferFriendsPageContainer>
      </Page.Body>

      <Page.Footer>
        <InvitedByFriendActions referralCode={referralCode} page={page} />
      </Page.Footer>
    </Page>
  );
}

export default function InvitedByFriend() {
  return (
    <AccountSelectorProviderMirror
      config={{
        sceneName: EAccountSelectorSceneName.home,
        sceneUrl: '',
      }}
      enabledNum={[0]}
    >
      <InvitedByFriendPage />
    </AccountSelectorProviderMirror>
  );
}
