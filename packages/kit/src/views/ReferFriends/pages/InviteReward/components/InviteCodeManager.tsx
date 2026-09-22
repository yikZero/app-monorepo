import { useCallback } from 'react';

import { YStack } from '@onekeyhq/components';

import { CreateCodeButton } from './InvitationDetailsSection/components/CreateCodeButton';
import { InviteCodeListTable } from './InvitationDetailsSection/components/InviteCodeListTable';
import { useInviteCodeList } from './InvitationDetailsSection/hooks/useInviteCodeList';

export function InviteCodeManager({
  inviteUrl,
  fetchSummaryInfo,
}: {
  inviteUrl: string;
  fetchSummaryInfo: () => void;
}) {
  const { codeListData, isLoading, refetch } = useInviteCodeList();
  const handleCodeUpdated = useCallback(
    async (shouldRefreshSummary?: boolean) => {
      if (shouldRefreshSummary) {
        fetchSummaryInfo();
      }
      await refetch();
    },
    [fetchSummaryInfo, refetch],
  );

  return (
    <YStack gap="$3" px="$pagePadding" pt="$4">
      <CreateCodeButton
        remainingCodes={codeListData?.remainingCodes}
        onCodeCreated={() => {
          void refetch();
        }}
        inviteUrlTemplate={inviteUrl}
      />
      <InviteCodeListTable
        codeListData={codeListData}
        isLoading={isLoading ?? false}
        refetch={refetch}
        onCodeUpdated={handleCodeUpdated}
      />
    </YStack>
  );
}
