import { useRoute } from '@react-navigation/core';
import { useIntl } from 'react-intl';

import { Alert, Page, Toast, YStack } from '@onekeyhq/components';
import { useAccountData } from '@onekeyhq/kit/src/hooks/useAccountData';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type {
  EModalApprovalManagementRoutes,
  IModalApprovalManagementParamList,
} from '@onekeyhq/shared/src/routes/approvalManagement';
import { EParseTxComponentType } from '@onekeyhq/shared/types/signatureConfirm';

import {
  Address,
  Default,
  Network,
} from '../../SignatureConfirm/components/SignatureConfirmComponents';

import type { RouteProp } from '@react-navigation/core';

// Demo copy (OK-67574). Title and description follow the server parse result
// agreed in OK-67064; the real page is TxConfirm fed by parse-transaction.
const DEMO_COPY = {
  title: 'Cancel EIP-7702 Delegation',
  description: 'You are canceling EIP-7702 delegation',
  currentDelegate: 'Current delegate',
  confirm: 'Revoke',
  cancel: 'Not now',
  demoToast: 'Demo only, no transaction sent',
};

function Eip7702RevokeConfirm() {
  const intl = useIntl();
  const route =
    useRoute<
      RouteProp<
        IModalApprovalManagementParamList,
        EModalApprovalManagementRoutes.Eip7702RevokeConfirm
      >
    >();
  const { networkId, delegateAddress, delegateLabel, riskReason } =
    route.params;
  const { network } = useAccountData({ networkId });

  return (
    <Page scrollEnabled>
      <Page.Header title={DEMO_COPY.title} />
      <Page.Body px="$5">
        <YStack gap="$5" py="$2.5">
          {riskReason ? (
            <Alert icon="ErrorSolid" type="danger" title={riskReason} />
          ) : null}
          <Network
            component={{
              type: EParseTxComponentType.Network,
              label: intl.formatMessage({ id: ETranslations.network__network }),
              networkId,
            }}
          />
          <Default
            component={{
              type: EParseTxComponentType.Default,
              label: intl.formatMessage({
                id: ETranslations.global_description,
              }),
              value: DEMO_COPY.description,
            }}
          />
          <Address
            networkId={networkId}
            component={{
              type: EParseTxComponentType.Address,
              label: DEMO_COPY.currentDelegate,
              address: delegateAddress,
              isNavigable: true,
              tags: [
                ...(delegateLabel
                  ? [{ value: delegateLabel, displayType: 'info' as const }]
                  : []),
                ...(riskReason
                  ? [
                      {
                        value: intl.formatMessage({
                          id: ETranslations.global_risk,
                        }),
                        displayType: 'critical' as const,
                      },
                    ]
                  : []),
              ],
            }}
          />
          <Default
            component={{
              type: EParseTxComponentType.Default,
              label: intl.formatMessage({
                id: ETranslations.global_est_network_fee,
              }),
              value: `0.0000432 ${network?.symbol ?? ''} ($0.06)`,
            }}
          />
        </YStack>
      </Page.Body>
      <Page.Footer
        onConfirmText={DEMO_COPY.confirm}
        onConfirm={() => {
          Toast.message({ title: DEMO_COPY.demoToast });
        }}
        onCancelText={DEMO_COPY.cancel}
        onCancel={(close) => close()}
      />
    </Page>
  );
}

export default Eip7702RevokeConfirm;
