import { memo } from 'react';

import { useIntl } from 'react-intl';

import { SizableText, Stack, YStack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import {
  useApprovalListAtom,
  useIsBulkRevokeModeAtom,
} from '../../states/jotai/contexts/approvalList';
import { ListItem } from '../ListItem';

import { useApprovalListViewContext } from './ApprovalListViewContext';

function HeaderItem({ label }: { label: string }) {
  return (
    <SizableText size="$bodyMdMedium" color="$textSubdued" userSelect="none">
      {label}
    </SizableText>
  );
}

// Demo (OK-67574): the revoke suggestion moved out of this header into
// RevokeSuggestionPill in the filter bar, so only the table header is left.
function ApprovalListHeader() {
  const intl = useIntl();
  const { tableLayout, selectDisabled } = useApprovalListViewContext();
  const [isBulkRevokeMode] = useIsBulkRevokeModeAtom();
  const [{ approvals }] = useApprovalListAtom();

  if (!tableLayout || approvals?.length <= 0) {
    return null;
  }

  return (
    <YStack>
      <ListItem
        testID="Wallet-Approval-List-Header"
        childrenBefore={
          platformEnv.isNative && isBulkRevokeMode && !selectDisabled ? (
            <Stack width="$8" />
          ) : undefined
        }
      >
        <Stack flexGrow={1} flexBasis={0} alignItems="flex-start">
          <HeaderItem
            label={intl.formatMessage({ id: ETranslations.global_contract })}
          />
        </Stack>
        <Stack flexGrow={1} flexBasis={0}>
          <HeaderItem
            label={intl.formatMessage({
              id: ETranslations.global_contract_address,
            })}
          />
        </Stack>
        <Stack flexGrow={1} flexBasis={0}>
          <HeaderItem
            label={intl.formatMessage({
              id: ETranslations.wallet_approval_approved_token,
            })}
          />
        </Stack>
        <Stack flexGrow={1} flexBasis={0} alignItems="flex-end" maxWidth="$36">
          <HeaderItem
            label={intl.formatMessage({
              id: ETranslations.global_approval_time,
            })}
          />
        </Stack>
      </ListItem>
    </YStack>
  );
}

export default memo(ApprovalListHeader);
