import type {
  IEarnWalletHistoryItem,
  IEarnWalletHistoryNetwork,
  IHardwareRecordItem,
} from '../referralCode/type';

export interface IBtcRewardCodeInfoParam {
  code: string;
  modelName: string;
  usdAmount: number;
  estimatedBtcAmount: string;
  btcPrice: number;
}

export enum EModalReferFriendsRoutes {
  ReferAFriend = 'ReferAFriend',
  InvitedByFriend = 'InvitedByFriend',
  YourReferred = 'YourReferred',
  YourReferredWalletAddresses = 'YourReferredWalletAddresses',
  HardwareSalesReward = 'HardwareSalesReward',
  HardwareSalesOrderDetail = 'HardwareSalesOrderDetail',
  InviteReward = 'InviteReward',
  EditAddress = 'EditAddress',
  EarnReward = 'EarnReward',
  RewardDistributionHistory = 'RewardDistributionHistory',
  ReferralLevel = 'ReferralLevel',
  RedemptionHistory = 'RedemptionHistory',
  PerpsReward = 'PerpsReward',
  BtcRewardVerifyOrder = 'BtcRewardVerifyOrder',
  BtcRewardSelectAddress = 'BtcRewardSelectAddress',
  BtcRewardConfirm = 'BtcRewardConfirm',
  BtcRewardSuccess = 'BtcRewardSuccess',
  BtcRewardDetail = 'BtcRewardDetail',
}

export type IModalReferFriendsParamList = {
  [EModalReferFriendsRoutes.ReferAFriend]: {
    utmSource?: string;
    code?: string;
  };
  [EModalReferFriendsRoutes.InvitedByFriend]: {
    code: string;
    page?: string;
  };
  [EModalReferFriendsRoutes.YourReferred]: undefined;
  [EModalReferFriendsRoutes.YourReferredWalletAddresses]: {
    networks: IEarnWalletHistoryNetwork[];
    items: IEarnWalletHistoryItem[];
  };
  [EModalReferFriendsRoutes.HardwareSalesReward]:
    | {
        showOrderDetail?: boolean;
        orderId?: string;
      }
    | undefined;
  [EModalReferFriendsRoutes.HardwareSalesOrderDetail]: {
    data: IHardwareRecordItem;
  };
  [EModalReferFriendsRoutes.InviteReward]:
    | {
        showRewardDistributionHistory?: boolean;
      }
    | undefined;
  [EModalReferFriendsRoutes.EditAddress]: {
    enabledNetworks: string[];
    accountId: string;
    address?: string;
    hideAddressBook?: boolean;
    enableAllowListValidation?: boolean;
    onAddressAdded: ({
      address,
      networkId,
    }: {
      address: string;
      networkId: string;
    }) => void;
  };
  [EModalReferFriendsRoutes.EarnReward]: {
    title: string;
  };
  [EModalReferFriendsRoutes.RewardDistributionHistory]: undefined;
  [EModalReferFriendsRoutes.ReferralLevel]: undefined;
  [EModalReferFriendsRoutes.RedemptionHistory]: undefined;
  [EModalReferFriendsRoutes.PerpsReward]: undefined;
  [EModalReferFriendsRoutes.BtcRewardVerifyOrder]: {
    codeInfo: IBtcRewardCodeInfoParam;
  };
  [EModalReferFriendsRoutes.BtcRewardSelectAddress]: {
    codeInfo: IBtcRewardCodeInfoParam;
    orderId?: string;
    productName?: string;
    preselectedAddressId?: string;
  };
  [EModalReferFriendsRoutes.BtcRewardConfirm]: {
    codeInfo: IBtcRewardCodeInfoParam;
    orderId?: string;
    productName?: string;
    address: string;
    addressLabel: string;
  };
  [EModalReferFriendsRoutes.BtcRewardSuccess]: {
    usdAmount: number;
    estimatedBtcAmount: string;
    address: string;
  };
  [EModalReferFriendsRoutes.BtcRewardDetail]: {
    recordId: string;
  };
};
