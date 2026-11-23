import type { ReactNode } from 'react';

import { render } from '@testing-library/react-native';

import ApprovalListHeader from './ApprovalListHeader';

let mockIsNative = false;
let mockIsBulkRevokeMode = false;
let mockTableLayout = false;
let mockSelectDisabled = false;
let mockHeaderBefore: ReactNode;

jest.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id,
  }),
}));

jest.mock('@onekeyhq/components', () => {
  function Container({ children }: { children?: ReactNode }) {
    return <>{children}</>;
  }

  return {
    SizableText: Container,
    Stack: Container,
    YStack: Container,
  };
});

jest.mock('@onekeyhq/shared/src/locale', () => ({
  ETranslations: {
    global_contract: 'global.contract',
    global_contract_address: 'global.contract_address',
    global_approval_time: 'global.approval_time',
    wallet_approval_approved_token: 'wallet.approval_approved_token',
  },
}));

jest.mock('@onekeyhq/shared/src/platformEnv', () => ({
  __esModule: true,
  default: {
    get isNative() {
      return mockIsNative;
    },
  },
}));

jest.mock('../../states/jotai/contexts/approvalList', () => ({
  useIsBulkRevokeModeAtom: () => [mockIsBulkRevokeMode],
  useApprovalListAtom: () => [{ approvals: [{ isRiskContract: true }] }],
}));

jest.mock('../ListItem', () => ({
  ListItem: ({
    children,
    childrenBefore,
    testID,
  }: {
    children?: ReactNode;
    childrenBefore?: ReactNode;
    testID?: string;
  }) => {
    if (testID === 'Wallet-Approval-List-Header') {
      mockHeaderBefore = childrenBefore;
    }
    return <>{children}</>;
  },
}));

jest.mock('./ApprovalListViewContext', () => ({
  useApprovalListViewContext: () => ({
    tableLayout: mockTableLayout,
    selectDisabled: mockSelectDisabled,
  }),
}));

describe('ApprovalListHeader', () => {
  beforeEach(() => {
    mockHeaderBefore = undefined;
    mockIsNative = false;
    mockIsBulkRevokeMode = false;
    mockTableLayout = false;
    mockSelectDisabled = false;
  });

  it('reserves the native wide bulk checkbox slot only while selection is enabled', () => {
    mockIsNative = true;
    mockIsBulkRevokeMode = true;
    mockTableLayout = true;
    render(<ApprovalListHeader />);
    expect((mockHeaderBefore as { props: { width: string } }).props.width).toBe(
      '$8',
    );

    // The header is memoized without props, so each case renders fresh.
    mockSelectDisabled = true;
    render(<ApprovalListHeader />);
    expect(mockHeaderBefore).toBeUndefined();

    mockSelectDisabled = false;
    mockIsNative = false;
    render(<ApprovalListHeader />);
    expect(mockHeaderBefore).toBeUndefined();
  });
});
