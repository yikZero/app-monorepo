/* cspell:disable */
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';

import { EBtcRewardStatus, ERedemptionType } from './types';

import type {
  IBtcRewardCodeInfo,
  IBtcRewardOrderInfo,
  IBtcRewardRecord,
  IBtcRewardWalletAddress,
} from './types';

const MOCK_CODES: Record<
  string,
  | (Omit<IBtcRewardCodeInfo, 'code'> & { error?: never })
  | { error: { code: string; message: string } }
> = {
  ABCD1234EFGH5678: {
    type: ERedemptionType.BtcReward,
    modelName: 'OneKey Pro',
    usdAmount: 50,
    estimatedBtcAmount: '0.00058',
    btcPrice: 86_200,
    isPreAssociatedOrder: false,
  },
  WXYZ9876MNOP5432: {
    type: ERedemptionType.BtcReward,
    modelName: 'OneKey Classic 1S',
    usdAmount: 30,
    estimatedBtcAmount: '0.00035',
    btcPrice: 86_200,
    isPreAssociatedOrder: true,
    preAssociatedOrderId: 'ORD-2025-00123',
  },
  SKIP1234ORDR5678: {
    type: ERedemptionType.BtcReward,
    modelName: 'OneKey Touch',
    usdAmount: 100,
    estimatedBtcAmount: '0.00116',
    btcPrice: 86_200,
    isPreAssociatedOrder: true,
    preAssociatedOrderId: 'ORD-2025-00456',
  },
  USED1234CODE5678: {
    error: {
      code: 'CODE_USED',
      message: 'This code has already been redeemed.',
    },
  },
  EXPR1234DATE5678: {
    error: { code: 'CODE_EXPIRED', message: 'This code has expired.' },
  },
  CAMP1234ENDS5678: {
    error: {
      code: 'CAMPAIGN_ENDED',
      message: 'This promotion campaign has ended.',
    },
  },
};

const MOCK_ORDERS: Record<string, IBtcRewardOrderInfo | { error: string }> = {
  'ORD-2025-00123': {
    orderId: 'ORD-2025-00123',
    productName: 'OneKey Pro',
  },
  'ORD-2025-00456': {
    orderId: 'ORD-2025-00456',
    productName: 'OneKey Touch',
  },
  'ORD-2025-00789': {
    orderId: 'ORD-2025-00789',
    productName: 'OneKey Classic 1S',
  },
  'ORD-REFUND-001': {
    error: 'This order has been refunded and is not eligible for redemption.',
  },
};

const MOCK_WALLET_ADDRESSES: IBtcRewardWalletAddress[] = [
  {
    id: 'hw-1',
    address: '0x1a2B3c4D5e6F7890AbCdEf1234567890aBcDeF12',
    label: 'OneKey Pro #1',
    walletType: 'hw',
    walletName: 'Hardware Wallet',
  },
  {
    id: 'hw-2',
    address: '0xaAbBcCdDeEfF00112233445566778899AaBbCcDd',
    label: 'OneKey Classic',
    walletType: 'hw',
    walletName: 'Hardware Wallet',
  },
  {
    id: 'hd-1',
    address: '0x9876543210FeDcBa9876543210fEdCbA98765432',
    label: 'Main Wallet',
    walletType: 'hd',
    walletName: 'HD Wallet',
  },
  {
    id: 'hd-2',
    address: '0x1111222233334444555566667777888899990000',
    label: 'Savings',
    walletType: 'hd',
    walletName: 'HD Wallet',
  },
  {
    id: 'imported-1',
    address: '0xDeAdBeEf00000000000000000000000000000001',
    label: 'Imported Account',
    walletType: 'imported',
    walletName: 'Imported',
  },
];

const MOCK_RECORDS: IBtcRewardRecord[] = [
  {
    id: 'rec-001',
    code: 'ABCD1234EFGH5678',
    orderId: 'ORD-2025-00123',
    productName: 'OneKey Pro',
    usdAmount: 50,
    btcAmount: '0.00058',
    btcPrice: 86_200,
    address: '0x1a2B3c4D5e6F7890AbCdEf1234567890aBcDeF12',
    status: EBtcRewardStatus.Distributed,
    createdAt: '2025-03-16T10:30:00Z',
    distributedAt: '2025-04-15T14:22:00Z',
    txHash:
      '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
  },
  {
    id: 'rec-002',
    code: 'QRST5678UVWX1234',
    orderId: 'ORD-2025-00789',
    productName: 'OneKey Classic 1S',
    usdAmount: 30,
    btcAmount: '0.00035',
    btcPrice: 86_200,
    address: '0x9876543210FeDcBa9876543210fEdCbA98765432',
    status: EBtcRewardStatus.Waiting,
    createdAt: '2025-04-10T08:15:00Z',
  },
  {
    id: 'rec-003',
    code: 'MNOP1234QRST5678',
    productName: 'OneKey Touch',
    usdAmount: 100,
    btcAmount: '0.00116',
    btcPrice: 86_200,
    address: '0x1a2B3c4D5e6F7890AbCdEf1234567890aBcDeF12',
    status: EBtcRewardStatus.PendingDistribution,
    createdAt: '2025-04-05T16:45:00Z',
  },
  {
    id: 'rec-004',
    code: 'JKLM9012NOPQ3456',
    orderId: 'ORD-2025-00456',
    productName: 'OneKey Pro',
    usdAmount: 50,
    btcAmount: '0.00058',
    btcPrice: 86_200,
    address: '0xaAbBcCdDeEfF00112233445566778899AaBbCcDd',
    status: EBtcRewardStatus.Rejected,
    createdAt: '2025-03-20T12:00:00Z',
    rejectReason: 'Order was refunded after the return period.',
  },
  {
    id: 'rec-005',
    code: 'STUV5678WXYZ9012',
    productName: 'OneKey Classic 1S',
    usdAmount: 30,
    btcAmount: '0.00035',
    btcPrice: 86_200,
    address: '0x9876543210FeDcBa9876543210fEdCbA98765432',
    status: EBtcRewardStatus.Distributing,
    createdAt: '2025-04-12T09:30:00Z',
  },
];

export async function mockVerifyCode(
  code: string,
): Promise<
  | { success: true; data: IBtcRewardCodeInfo }
  | { success: false; error: string }
> {
  await timerUtils.wait(800);
  const upperCode = code.toUpperCase().replace(/\s/g, '');
  const entry = MOCK_CODES[upperCode];
  if (!entry) {
    return { success: false, error: 'Invalid redemption code.' };
  }
  if ('error' in entry && entry.error) {
    return { success: false, error: entry.error.message };
  }
  return { success: true, data: { ...entry, code: upperCode } };
}

export async function mockVerifyOrder(
  orderId: string,
): Promise<
  | { success: true; data: IBtcRewardOrderInfo }
  | { success: false; error: string }
> {
  await timerUtils.wait(600);
  const entry = MOCK_ORDERS[orderId.trim()];
  if (!entry) {
    return { success: false, error: 'Order not found.' };
  }
  if ('error' in entry) {
    return { success: false, error: entry.error };
  }
  return { success: true, data: entry };
}

export async function mockSubmitRedemption(_params: {
  code: string;
  orderId?: string;
  address: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  await timerUtils.wait(1000);
  return { success: true };
}

export async function mockGetRecords(): Promise<IBtcRewardRecord[]> {
  await timerUtils.wait(500);
  return MOCK_RECORDS;
}

export async function mockGetRecordDetail(
  recordId: string,
): Promise<IBtcRewardRecord | null> {
  await timerUtils.wait(400);
  return MOCK_RECORDS.find((r) => r.id === recordId) ?? null;
}

const WALLET_TYPE_ORDER: Record<IBtcRewardWalletAddress['walletType'], number> =
  { hw: 0, hd: 1, imported: 2 };

const SORTED_WALLET_ADDRESSES = [...MOCK_WALLET_ADDRESSES].toSorted(
  (a, b) => WALLET_TYPE_ORDER[a.walletType] - WALLET_TYPE_ORDER[b.walletType],
);

export function mockGetLocalWalletAddresses(): IBtcRewardWalletAddress[] {
  return SORTED_WALLET_ADDRESSES;
}
