import type { IAddressRiskCheckResult } from '../../types/addressRiskCheck';

export enum EModalAddressRiskCheckRoutes {
  AddressRiskCheckInput = 'AddressRiskCheckInput',
  AddressRiskCheckResult = 'AddressRiskCheckResult',
  AddressRiskCheckHistory = 'AddressRiskCheckHistory',
}

export type IModalAddressRiskCheckParamList = {
  [EModalAddressRiskCheckRoutes.AddressRiskCheckInput]: undefined;
  [EModalAddressRiskCheckRoutes.AddressRiskCheckResult]: {
    result: IAddressRiskCheckResult;
  };
  [EModalAddressRiskCheckRoutes.AddressRiskCheckHistory]: undefined;
};
