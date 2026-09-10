import type { IUnsignedMessage } from '@onekeyhq/core/src/types';
import { EHostSecurityLevel } from '@onekeyhq/shared/types/discovery';
import type { IHostSecurity } from '@onekeyhq/shared/types/discovery';
import { EMessageTypesEth } from '@onekeyhq/shared/types/message';
import {
  EParseTxComponentType,
  ETransferDirection,
  type IDisplayComponentSimulation,
  type ISignatureConfirmDisplay,
} from '@onekeyhq/shared/types/signatureConfirm';

import { getPrimeDemoTokenIconUri } from './assetUris';

import type { IPrimeDemoFixture } from './types';

const PERMIT2_TYPED_DATA = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    PermitSingle: [
      { name: 'details', type: 'PermitDetails' },
      { name: 'spender', type: 'address' },
      { name: 'sigDeadline', type: 'uint256' },
    ],
    PermitDetails: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
      { name: 'nonce', type: 'uint48' },
    ],
  },
  primaryType: 'PermitSingle',
  domain: {
    name: 'Permit2',
    chainId: 1,
    verifyingContract: '0x000000000022D473030f116DDee9F6B43aC78BA3',
  },
  message: {
    details: {
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: '1461501637330902918203684832716283019655932542975',
      expiration: '281474976710655',
      nonce: '0',
    },
    spender: '0x000000000022D473030f116DDee9F6B43aC78BA3',
    sigDeadline: '281474976710655',
  },
};

export function buildPrimeDemoUrlSecurityInfo(
  fixture: IPrimeDemoFixture,
): IHostSecurity {
  let host = 'app.uniswap.org';
  try {
    host = new URL(fixture.origin).host;
  } catch {
    // Keep the Uniswap fixture host when origin is not a valid URL.
  }
  return {
    host,
    level: EHostSecurityLevel.Unknown,
    attackTypes: [],
    phishingSite: false,
    checkSources: [],
    alert: '',
    projectName: 'Uniswap',
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

export function buildPrimeDemoUnsignedMessage(): IUnsignedMessage {
  return {
    type: EMessageTypesEth.TYPED_DATA_V4,
    message: JSON.stringify(PERMIT2_TYPED_DATA),
  };
}

export function buildPrimeDemoMessageDisplay(
  fixture: IPrimeDemoFixture,
): ISignatureConfirmDisplay {
  return {
    title: fixture.title,
    components: [],
    alerts: [],
  };
}

export function buildPrimeDemoSimulationComponents(
  fixture: IPrimeDemoFixture,
): IDisplayComponentSimulation[] {
  return [
    {
      type: EParseTxComponentType.Simulation,
      label: 'Asset changes',
      assets: [
        {
          type: EParseTxComponentType.InternalAssets,
          label: fixture.outgoing.symbol,
          name: fixture.outgoing.symbol,
          icon: getPrimeDemoTokenIconUri(fixture.outgoing.symbol),
          symbol: fixture.outgoing.symbol,
          amount: fixture.outgoing.amount,
          amountParsed: fixture.outgoing.amount,
          transferDirection: ETransferDirection.Out,
        },
        {
          type: EParseTxComponentType.InternalAssets,
          label: fixture.incoming.symbol,
          name: fixture.incoming.symbol,
          icon: getPrimeDemoTokenIconUri(fixture.incoming.symbol),
          symbol: fixture.incoming.symbol,
          amount: fixture.incoming.amount,
          amountParsed: fixture.incoming.amount,
          transferDirection: ETransferDirection.In,
        },
      ],
    },
  ];
}
