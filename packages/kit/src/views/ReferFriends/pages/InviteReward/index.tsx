import { useCallback, useEffect, useState } from 'react';

import { useFocusEffect, useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import {
  Page,
  ScrollView,
  Spinner,
  Stack,
  XStack,
  useMedia,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { AccountSelectorProviderMirror } from '@onekeyhq/kit/src/components/AccountSelector';
import { TabPageHeader } from '@onekeyhq/kit/src/components/TabPageHeader';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { useRedirectWhenNotLoggedIn } from '@onekeyhq/kit/src/views/ReferFriends/hooks/useRedirectWhenNotLoggedIn';
import { BenefitsTabPlaceholder } from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/components/BenefitsTabPlaceholder';
import { InviteTabContent } from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/components/InviteTabContent';
import { LogoutButton } from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/components/LogoutButton';
import { useReferralCodeCard } from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/components/ReferralCodeCard/hooks/useReferralCodeCard';
import { ReferralJobTabs } from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/components/ReferralJobTabs';
import { RulesButton } from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/components/RulesButton';
import {
  EReferralPageTab,
  type IReferralPageTab,
  resolveReferralPageTab,
} from '@onekeyhq/kit/src/views/ReferFriends/pages/InviteReward/referralPageTab';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { ETabRoutes } from '@onekeyhq/shared/src/routes';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import { ReferFriendsTestIDs } from '../../testIDs';
import { useNavigateToRewardHistory } from '../RewardDistributionHistory/hooks/useNavigateToRewardHistory';

function ReferralPageHeader({ activeTab }: { activeTab: IReferralPageTab }) {
  const intl = useIntl();
  const { md } = useMedia();
  const renderHeaderRight = useCallback(() => {
    if (activeTab !== EReferralPageTab.invite) {
      return null;
    }
    return <RulesButton />;
  }, [activeTab]);

  if (platformEnv.isNative || md) {
    return (
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.referral_title,
        })}
        headerRight={renderHeaderRight}
      />
    );
  }

  return (
    <TabPageHeader
      sceneName={EAccountSelectorSceneName.home}
      tabRoute={ETabRoutes.ReferFriends}
      hideHeaderLeft={platformEnv.isDesktop}
    />
  );
}

function InviteRewardPage() {
  const intl = useIntl();
  const { md } = useMedia();
  const navigation = useAppNavigation();
  const navigateToRewardHistory = useNavigateToRewardHistory();
  const route = useRoute<{
    key: string;
    name: string;
    params?: {
      showRewardDistributionHistory?: boolean;
      tab?: IReferralPageTab;
    };
  }>();
  const routeTab = resolveReferralPageTab(route.params?.tab);
  const [activeTab, setActiveTab] = useState<IReferralPageTab>(routeTab);

  useEffect(() => {
    setActiveTab(routeTab);
  }, [routeTab]);

  useFocusEffect(
    useCallback(() => {
      if (!route.params?.showRewardDistributionHistory) {
        return;
      }
      navigation.setParams({ showRewardDistributionHistory: undefined });
      navigateToRewardHistory();
    }, [
      navigation,
      navigateToRewardHistory,
      route.params?.showRewardDistributionHistory,
    ]),
  );

  useRedirectWhenNotLoggedIn();

  const [isFirstLoading, setIsFirstLoading] = useState(true);

  const {
    result: summaryInfo,
    run: fetchSummaryInfo,
    isLoading,
  } = usePromiseResult(
    async () => {
      return backgroundApiProxy.serviceReferralCode.getSummaryInfo();
    },
    [],
    {
      initResult: undefined,
      pollingInterval: timerUtils.getTimeDurationMs({ minute: 1 }),
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      undefinedResultIfError: true,
      watchLoading: false,
      onIsLoadingChange: (loading) => {
        if (!loading && isFirstLoading) {
          setIsFirstLoading(false);
        }
      },
    },
  );

  const { copyLink } = useReferralCodeCard({
    inviteUrl: summaryInfo?.inviteUrl ?? '',
    inviteCode: summaryInfo?.inviteCode ?? '',
  });

  const isFetching = isFirstLoading && (isLoading ?? summaryInfo === undefined);
  const showInviteFooter =
    platformEnv.isNative &&
    activeTab === EReferralPageTab.invite &&
    Boolean(summaryInfo?.inviteUrl);

  return (
    <Page>
      <ReferralPageHeader activeTab={activeTab} />
      <Page.Body>
        <XStack
          px="$pagePadding"
          pt="$4"
          pb="$2"
          ai="center"
          jc="space-between"
        >
          <ReferralJobTabs value={activeTab} onChange={setActiveTab} />
          {!md && activeTab === EReferralPageTab.invite ? (
            <XStack gap="$4">
              <RulesButton />
              {platformEnv.isWeb ? <LogoutButton /> : null}
            </XStack>
          ) : null}
        </XStack>
        {isFetching && activeTab === EReferralPageTab.invite ? (
          <Stack flex={1} ai="center" jc="center">
            <Spinner size="large" />
          </Stack>
        ) : (
          <ScrollView>
            <Page.Container padded={false}>
              {activeTab === EReferralPageTab.invite ? (
                <InviteTabContent
                  summaryInfo={summaryInfo}
                  fetchSummaryInfo={fetchSummaryInfo}
                />
              ) : (
                <BenefitsTabPlaceholder />
              )}
            </Page.Container>
          </ScrollView>
        )}
      </Page.Body>
      {showInviteFooter ? (
        <Page.Footer>
          <Page.FooterActions
            onConfirm={copyLink}
            onConfirmText={intl.formatMessage({
              id: ETranslations.browser_copy_link,
            })}
            confirmButtonProps={{
              testID: ReferFriendsTestIDs.copyLinkFooterBtn,
            }}
          />
        </Page.Footer>
      ) : null}
    </Page>
  );
}

export default function InviteReward() {
  return (
    <AccountSelectorProviderMirror
      config={{
        sceneName: EAccountSelectorSceneName.home,
        sceneUrl: '',
      }}
      enabledNum={[0]}
    >
      <InviteRewardPage />
    </AccountSelectorProviderMirror>
  );
}
