import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRoute } from '@react-navigation/native';
import { CanceledError } from 'axios';
import { isNil, pickBy } from 'lodash';
import { useIntl } from 'react-intl';
import { useDebouncedCallback } from 'use-debounce';

import {
  Button,
  Page,
  ScrollView,
  Stack,
  Toast,
  XStack,
} from '@onekeyhq/components';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { getNetworkIdsMap } from '@onekeyhq/shared/src/config/networkIds';
import { getNetworksSupportBulkRevokeApproval } from '@onekeyhq/shared/src/config/presetNetworks';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';
import type { IModalApprovalManagementParamList } from '@onekeyhq/shared/src/routes/approvalManagement';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import approvalUtils from '@onekeyhq/shared/src/utils/approvalUtils';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';
import type { IContractApproval } from '@onekeyhq/shared/types/approval';

import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';
import { NetworkSelectorTriggerApproval } from '../../../components/AccountSelector';
import ApprovalListView from '../../../components/ApprovalListView';
import Eip7702DelegationList, {
  ApprovalTypeSegment,
  EApprovalListType,
} from '../../../components/ApprovalListView/Eip7702DelegationList';
import RevokeSuggestionPill from '../../../components/ApprovalListView/RevokeSuggestionPill';
import { useEip7702DemoDelegations } from '../../../components/ApprovalListView/useEip7702DemoDelegations';
import { usePromiseResult } from '../../../hooks/usePromiseResult';
import {
  ProviderJotaiContextApprovalList,
  useApprovalListActions,
  useApprovalListAtom,
  useContractMapAtom,
  useIsBulkRevokeModeAtom,
  useSearchNetworkAtom,
  useSelectedTokensAtom,
  useTokenMapAtom,
} from '../../../states/jotai/contexts/approvalList';
import { EmptyNoWalletView } from '../../AccountManagerStacks/pages/AccountSelectorStack/WalletDetails/EmptyView';
import ApprovalActions from '../components/ApprovalActions';
import { useBulkRevoke } from '../hooks/useBulkRevoke';
import { ApprovalManagementTestIDs } from '../testIDs';

import type { RouteProp } from '@react-navigation/core';

function ApprovalList() {
  const route =
    useRoute<
      RouteProp<
        IModalApprovalManagementParamList,
        EModalApprovalManagementRoutes.ApprovalList
      >
    >();
  const {
    accountId,
    networkId,
    walletId,
    indexedAccountId,
    isBulkRevokeMode: routeBulkMode,
    approvals: approvalsProp,
    tokenMap: tokenMapProp,
    contractMap: contractMapProp,
  } = route.params;

  const intl = useIntl();
  const navigation = useAppNavigation();
  const {
    toggleIsBulkRevokeMode,
    updateSearchKey,
    updateSearchNetwork,
    updateSelectedTokens,
    updateIsBulkRevokeMode,
    updateApprovalList,
    updateTokenMap,
    updateContractMap,
    updateApprovalListState,
  } = useApprovalListActions().current;

  const approvalListInitRef = useRef(false);

  const [listType, setListType] = useState(EApprovalListType.TokenApprovals);
  const delegations = useEip7702DemoDelegations({
    networkId: networkId ?? '',
    isAllNetworks: networkUtils.isAllNetwork({ networkId }),
  });

  const { navigationToBulkRevokeProcess, isBuildingRevokeTxs } =
    useBulkRevoke();

  const [{ networkId: searchNetworkId }] = useSearchNetworkAtom();
  const [isBulkRevokeMode] = useIsBulkRevokeModeAtom();
  const [{ selectedTokens }] = useSelectedTokensAtom();
  const [{ approvals }] = useApprovalListAtom();
  const [{ tokenMap }] = useTokenMapAtom();
  const [{ contractMap }] = useContractMapAtom();

  // Demo (OK-67574): the switch only appears when the account has delegations;
  // search, network filter and edit belong to token approvals only.
  const showTypeSegment = delegations.length > 0 && !isBulkRevokeMode;
  const isEip7702List =
    showTypeSegment && listType === EApprovalListType.Eip7702;
  const riskyDelegationsCount = useMemo(
    () => delegations.filter((d) => !!d.riskReason).length,
    [delegations],
  );

  const { result: availableWallets } = usePromiseResult(async () => {
    const { wallets } = await backgroundApiProxy.serviceAccount.getWallets({
      ignoreEmptySingletonWalletAccounts: true,
      ignoreNonBackedUpWallets: true,
    });
    return wallets.filter(
      (w) =>
        !accountUtils.isQrWallet({ walletId: w.id }) &&
        !accountUtils.isOthersWallet({ walletId: w.id }) &&
        !w.deprecated,
    );
  }, []);

  const { run } = usePromiseResult(async () => {
    if (!searchNetworkId || !availableWallets?.length) {
      return;
    }

    if (!approvalListInitRef.current) {
      updateApprovalListState({
        isRefreshing: true,
      });
    }

    let realAccountId = accountId;

    const globalDeriveType =
      await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
        networkId: searchNetworkId,
      });

    if (indexedAccountId) {
      const { accounts } =
        await backgroundApiProxy.serviceAccount.getAccountsByIndexedAccounts({
          indexedAccountIds: [indexedAccountId ?? ''],
          networkId: searchNetworkId,
          deriveType: globalDeriveType,
        });
      realAccountId = accounts[0]?.id ?? accountId;
    }

    await backgroundApiProxy.serviceApproval.abortFetchAccountApprovals();

    try {
      const resp =
        await backgroundApiProxy.serviceApproval.fetchAccountApprovals({
          accountId: realAccountId,
          networkId: searchNetworkId,
          indexedAccountId,
          networksEnabledOnly: false,
        });

      updateApprovalList({ data: resp.contractApprovals });
      updateTokenMap({ data: resp.tokenMap });
      updateContractMap({ data: resp.contractMap });
    } catch (error) {
      if (error instanceof CanceledError) {
        console.log('fetchAccountApprovals canceled');
      } else {
        throw error;
      }
    } finally {
      updateApprovalListState({
        isRefreshing: false,
        initialized: true,
      });
    }
  }, [
    availableWallets,
    updateApprovalListState,
    accountId,
    searchNetworkId,
    indexedAccountId,
    updateApprovalList,
    updateTokenMap,
    updateContractMap,
  ]);

  useEffect(() => {
    const refreshAnyway = () => {
      void run({ alwaysSetState: true });
    };

    appEventBus.on(EAppEventBusNames.RefreshApprovalList, refreshAnyway);
    return () => {
      appEventBus.off(EAppEventBusNames.RefreshApprovalList, refreshAnyway);
    };
  }, [run]);

  useEffect(() => {
    if (!isNil(routeBulkMode) && !accountUtils.isWatchingWallet({ walletId })) {
      updateIsBulkRevokeMode(!!routeBulkMode);
    }
    return () => {
      updateSearchKey('');
      updateIsBulkRevokeMode(false);
      updateSelectedTokens({
        selectedTokens: {},
      });
    };
  }, [
    routeBulkMode,
    updateIsBulkRevokeMode,
    updateSearchKey,
    updateSelectedTokens,
    walletId,
  ]);

  useEffect(() => {
    if (!isNil(approvalsProp)) {
      approvalListInitRef.current = true;
      updateApprovalListState({
        isRefreshing: false,
        initialized: true,
      });
      updateApprovalList({ data: approvalsProp });
    }
    if (!isNil(tokenMapProp)) {
      updateTokenMap({ data: tokenMapProp });
    }
    if (!isNil(contractMapProp)) {
      updateContractMap({ data: contractMapProp });
    }
  }, [
    approvalsProp,
    tokenMapProp,
    contractMapProp,
    updateApprovalList,
    updateTokenMap,
    updateContractMap,
    updateApprovalListState,
  ]);

  useEffect(() => {
    const networksSupportBulkRevokeApproval =
      getNetworksSupportBulkRevokeApproval();

    if (
      networkUtils.isAllNetwork({ networkId }) ||
      networksSupportBulkRevokeApproval[networkId]
    ) {
      updateSearchNetwork(networkId);
    } else {
      updateSearchNetwork(getNetworkIdsMap().onekeyall);
    }
  }, [networkId, updateSearchNetwork]);

  const filteredSelectedTokensByNetwork = useMemo(() => {
    if (searchNetworkId === getNetworkIdsMap().onekeyall) {
      return selectedTokens;
    }
    return pickBy(selectedTokens, (_, key) => {
      return (
        approvalUtils.parseSelectedTokenKey({
          selectedTokenKey: key,
        }).networkId === searchNetworkId
      );
    });
  }, [selectedTokens, searchNetworkId]);

  const filteredApprovalsByNetwork = useMemo(() => {
    if (searchNetworkId === getNetworkIdsMap().onekeyall) {
      return approvals;
    }
    return approvals.filter((approval) => {
      return approval.networkId === searchNetworkId;
    });
  }, [approvals, searchNetworkId]);

  const { isSelectAllTokens, selectedCount } = useMemo(() => {
    return approvalUtils.checkIsSelectAllTokens({
      approvals: filteredApprovalsByNetwork,
      selectedTokens: filteredSelectedTokensByNetwork,
    });
  }, [filteredSelectedTokensByNetwork, filteredApprovalsByNetwork]);

  const handleSearchTextChange = useDebouncedCallback((text: string) => {
    updateSearchKey(text);
  }, 500);

  // The header search bar unmounts on the EIP-7702 tab; drop its keyword so
  // the token list is not filtered by text the user can no longer see.
  const handleListTypeChange = useCallback(
    (value: EApprovalListType) => {
      if (value === EApprovalListType.Eip7702) {
        handleSearchTextChange.cancel();
        updateSearchKey('');
      }
      setListType(value);
    },
    [handleSearchTextChange, updateSearchKey],
  );
  const showEip7702List = useCallback(() => {
    // The switch is hidden in edit mode; leave it so the tab can show.
    updateIsBulkRevokeMode(false);
    handleListTypeChange(EApprovalListType.Eip7702);
  }, [handleListTypeChange, updateIsBulkRevokeMode]);

  const renderNetworkFilter = useCallback(() => {
    const networksSupportBulkRevokeApproval =
      getNetworksSupportBulkRevokeApproval();

    const availableNetworkIds: string[] = [getNetworkIdsMap().onekeyall];

    Object.keys(networksSupportBulkRevokeApproval).forEach((n) => {
      availableNetworkIds.push(n);
    });

    return (
      <XStack
        alignItems="center"
        justifyContent="space-between"
        px="$5"
        pb="$2"
      >
        <NetworkSelectorTriggerApproval
          networkIds={availableNetworkIds}
          value={searchNetworkId}
          onChange={(value) => {
            approvalListInitRef.current = false;
            updateSearchNetwork(value);
          }}
        />
        {accountUtils.isWatchingWallet({ walletId }) ? null : (
          <RevokeSuggestionPill
            accountId={accountId}
            networkId={searchNetworkId}
            indexedAccountId={indexedAccountId}
            riskyDelegationsCount={riskyDelegationsCount}
            onViewDelegations={showEip7702List}
          />
        )}
      </XStack>
    );
  }, [
    searchNetworkId,
    updateSearchNetwork,
    walletId,
    accountId,
    indexedAccountId,
    riskyDelegationsCount,
    showEip7702List,
  ]);
  const renderHeaderRight = useCallback(() => {
    return (
      <Button
        testID={ApprovalManagementTestIDs.editBtn}
        size="medium"
        variant="tertiary"
        onPress={() => {
          if (accountUtils.isWatchingWallet({ walletId })) {
            Toast.error({
              title: intl.formatMessage({
                id: ETranslations.wallet_approval_revocation_not_available_for_watch_only_wallets,
              }),
            });
            return;
          }

          toggleIsBulkRevokeMode();
        }}
      >
        {isBulkRevokeMode
          ? intl.formatMessage({ id: ETranslations.global_done })
          : intl.formatMessage({ id: ETranslations.global_edit })}
      </Button>
    );
  }, [intl, toggleIsBulkRevokeMode, isBulkRevokeMode, walletId]);

  const handleApprovalOnPress = useCallback(
    (approval: IContractApproval) => {
      navigation.push(EModalApprovalManagementRoutes.ApprovalDetails, {
        approval,
        isSelectMode: isBulkRevokeMode,
        onSelected: ({
          selectedTokens: _selectedTokens,
        }: {
          selectedTokens: Record<string, boolean>;
        }) => {
          updateSelectedTokens({
            selectedTokens: _selectedTokens,
            merge: true,
          });
        },
        selectedTokens: filteredSelectedTokensByNetwork,
        tokenMap,
        contractMap,
      });
    },
    [
      navigation,
      isBulkRevokeMode,
      updateSelectedTokens,
      filteredSelectedTokensByNetwork,
      tokenMap,
      contractMap,
    ],
  );
  const handleSelectAll = useCallback(() => {
    const selectedTokensTemp = approvalUtils.buildToggleSelectAllTokensMap({
      approvals: filteredApprovalsByNetwork,
      toggle: !(isSelectAllTokens === true),
    });

    updateSelectedTokens({
      selectedTokens: selectedTokensTemp,
    });
  }, [updateSelectedTokens, filteredApprovalsByNetwork, isSelectAllTokens]);

  const handleOnConfirm = useCallback(() => {
    void navigationToBulkRevokeProcess({
      selectedTokens: filteredSelectedTokensByNetwork,
      tokenMap,
      contractMap,
      approvals: filteredApprovalsByNetwork,
    });
  }, [
    navigationToBulkRevokeProcess,
    filteredSelectedTokensByNetwork,
    tokenMap,
    contractMap,
    filteredApprovalsByNetwork,
  ]);
  const handleOnCancel = useCallback(() => {
    updateIsBulkRevokeMode(false);
  }, [updateIsBulkRevokeMode]);

  const renderBulkRevokeActions = () => {
    if (!isBulkRevokeMode) {
      return null;
    }

    return (
      <ApprovalActions
        isSelectAll={isSelectAllTokens}
        isBulkRevokeMode={isBulkRevokeMode}
        setIsSelectAll={handleSelectAll}
        onConfirm={handleOnConfirm}
        onCancel={handleOnCancel}
        onCancelText={intl.formatMessage({
          id: ETranslations.wallet_approval_cancel,
        })}
        selectedCount={selectedCount}
        isBuildingRevokeTxs={isBuildingRevokeTxs}
      />
    );
  };

  if (availableWallets && availableWallets.length === 0) {
    return (
      <Page>
        <Page.Header
          title={intl.formatMessage({
            id: ETranslations.global_approval_list,
          })}
        />
        <Page.Body>
          <EmptyNoWalletView />
        </Page.Body>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header
        title={
          isBulkRevokeMode
            ? intl.formatMessage({
                id: ETranslations.wallet_approval_manage_title,
              })
            : intl.formatMessage({ id: ETranslations.global_approval_list })
        }
        headerRight={isEip7702List ? undefined : renderHeaderRight}
        headerSearchBarOptions={
          isEip7702List
            ? undefined
            : {
                placeholder: intl.formatMessage({
                  id: ETranslations.global_search,
                }),
                onSearchTextChange: handleSearchTextChange,
              }
        }
      />
      <Page.Body>
        {showTypeSegment ? (
          <Stack px="$5" pb="$3">
            <ApprovalTypeSegment
              fullWidth
              value={listType}
              onChange={handleListTypeChange}
              delegations={delegations}
            />
          </Stack>
        ) : null}
        {isEip7702List ? (
          <ScrollView>
            <Eip7702DelegationList
              delegations={delegations}
              revokeDisabled={accountUtils.isWatchingWallet({ walletId })}
            />
          </ScrollView>
        ) : (
          <>
            {renderNetworkFilter()}
            <ApprovalListView
              withHeader
              accountId={accountId}
              networkId={searchNetworkId}
              indexedAccountId={indexedAccountId}
              onPress={handleApprovalOnPress}
            />
          </>
        )}
      </Page.Body>
      {renderBulkRevokeActions()}
    </Page>
  );
}

const ApprovalListWithProvider = memo(() => {
  return (
    <ProviderJotaiContextApprovalList>
      <ApprovalList />
    </ProviderJotaiContextApprovalList>
  );
});

ApprovalListWithProvider.displayName = 'ApprovalListWithProvider';

export default ApprovalListWithProvider;
