import type { IModalFlowNavigatorConfig } from '@onekeyhq/components';
import type { IModalApprovalManagementParamList } from '@onekeyhq/shared/src/routes/approvalManagement';
import { EModalApprovalManagementRoutes } from '@onekeyhq/shared/src/routes/approvalManagement';

import { LazyLoadPage } from '../../../components/LazyLoadPage';

const ApprovalDetails = LazyLoadPage(() => import('../pages/ApprovalDetails'));
const RevokeSuggestion = LazyLoadPage(
  () => import('../pages/RevokeSuggestion'),
);
const ApprovalList = LazyLoadPage(() => import('../pages/ApprovalList'));
const BulkRevoke = LazyLoadPage(() => import('../pages/BulkRevoke'));
const Eip7702RevokeConfirm = LazyLoadPage(
  () => import('../pages/Eip7702RevokeConfirm'),
);

const TxConfirm = LazyLoadPage(
  () =>
    import('@onekeyhq/kit/src/views/SignatureConfirm/pages/TxConfirm/TxConfirm'),
);

export const ModalApprovalManagementStack: IModalFlowNavigatorConfig<
  EModalApprovalManagementRoutes,
  IModalApprovalManagementParamList
>[] = [
  {
    name: EModalApprovalManagementRoutes.ApprovalDetails,
    component: ApprovalDetails,
  },
  {
    name: EModalApprovalManagementRoutes.RevokeSuggestion,
    component: RevokeSuggestion,
  },
  {
    name: EModalApprovalManagementRoutes.ApprovalList,
    component: ApprovalList,
  },
  {
    name: EModalApprovalManagementRoutes.BulkRevoke,
    component: BulkRevoke,
  },
  {
    name: EModalApprovalManagementRoutes.TxConfirm,
    component: TxConfirm,
  },
  {
    name: EModalApprovalManagementRoutes.Eip7702RevokeConfirm,
    component: Eip7702RevokeConfirm,
  },
];
