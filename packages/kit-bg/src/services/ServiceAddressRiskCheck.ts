import {
  backgroundClass,
  backgroundMethod,
} from '@onekeyhq/shared/src/background/backgroundDecorators';
import { memoizee } from '@onekeyhq/shared/src/utils/cacheUtils';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import type {
  IAddressRiskCheckDetails,
  IAddressRiskCheckNetwork,
  IAddressRiskCheckResult,
} from '@onekeyhq/shared/types/addressRiskCheck';
import { EServiceEndpointEnum } from '@onekeyhq/shared/types/endpoint';
import type { IApiClientResponse } from '@onekeyhq/shared/types/endpoint';

import ServiceBase from './ServiceBase';

@backgroundClass()
class ServiceAddressRiskCheck extends ServiceBase {
  constructor({ backgroundApi }: { backgroundApi: any }) {
    super({ backgroundApi });
  }

  // Server-driven allowlist of networks (OneKey networkId + display name). The
  // client never hardcodes the MistTrack coin mapping. Cached briefly since the
  // list rarely changes within a session.
  getSupportedNetworks = memoizee(
    async (): Promise<IAddressRiskCheckNetwork[]> => {
      const client = await this.getOneKeyIdClient(EServiceEndpointEnum.Prime);
      const res = await client.get<
        IApiClientResponse<{ list: IAddressRiskCheckNetwork[] }>
      >('/prime/v1/kyt/address-risk/supported-networks');
      return res.data.data?.list ?? [];
    },
    {
      promise: true,
      maxAge: timerUtils.getTimeDurationMs({ minute: 5 }),
    },
  );

  @backgroundMethod()
  async apiGetSupportedNetworks(): Promise<IAddressRiskCheckNetwork[]> {
    return this.getSupportedNetworks();
  }

  // POST /prime/v1/kyt/address-risk/check — main risk score result (图5).
  @backgroundMethod()
  async checkAddressRisk({
    networkId,
    address,
  }: {
    networkId: string;
    address: string;
  }): Promise<IAddressRiskCheckResult> {
    const client = await this.getOneKeyIdClient(EServiceEndpointEnum.Prime);
    const res = await client.post<IApiClientResponse<IAddressRiskCheckResult>>(
      '/prime/v1/kyt/address-risk/check',
      { networkId, address },
    );
    return res.data.data;
  }

  // POST /prime/v1/kyt/address-risk/details — deep analysis (图6), loaded on
  // demand when the user taps "More address analysis".
  @backgroundMethod()
  async getAddressRiskDetails({
    networkId,
    address,
  }: {
    networkId: string;
    address: string;
  }): Promise<IAddressRiskCheckDetails> {
    const client = await this.getOneKeyIdClient(EServiceEndpointEnum.Prime);
    const res = await client.post<IApiClientResponse<IAddressRiskCheckDetails>>(
      '/prime/v1/kyt/address-risk/details',
      { networkId, address },
    );
    return res.data.data;
  }
}

export default ServiceAddressRiskCheck;
