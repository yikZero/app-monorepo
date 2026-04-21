export enum ERedemptionType {
  LevelUpgrade = 'level_upgrade',
  BtcReward = 'btc_reward',
}

export enum EBtcRewardStatus {
  Waiting = 'waiting', // 30-day return period
  PendingDistribution = 'pending_distribution',
  Distributing = 'distributing',
  Distributed = 'distributed',
  Rejected = 'rejected',
}

export interface IBtcRewardCodeInfo {
  type: ERedemptionType;
  code: string;
  modelName: string;
  usdAmount: number;
  estimatedBtcAmount: string;
  btcPrice: number;
  isPreAssociatedOrder: boolean;
  preAssociatedOrderId?: string;
}

export interface IBtcRewardOrderInfo {
  orderId: string;
  productName: string;
}

export interface IBtcRewardWalletAddress {
  id: string;
  address: string;
  label: string;
  walletType: 'hw' | 'hd' | 'imported';
  walletName: string;
}

export interface IBtcRewardRecord {
  id: string;
  code: string;
  orderId?: string;
  productName: string;
  usdAmount: number;
  btcAmount: string;
  btcPrice: number;
  address: string;
  status: EBtcRewardStatus;
  createdAt: string;
  distributedAt?: string;
  txHash?: string;
  rejectReason?: string;
}
