import platformEnv from '@onekeyhq/shared/src/platformEnv';

// Demo-only data for the EIP-7702 delegation design (OK-67574). Mirrors the
// server fields: erc7702DelegatorMap[`${networkId}_${owner}`].address plus
// contractMap[`${networkId}_${delegate}`] (label / logoURI) and riskReason.
export type IEip7702DelegationDemo = {
  networkId: string;
  delegateAddress: string;
  label?: string;
  logoURI?: string;
  riskReason?: string;
};

export const EIP7702_DEMO_DELEGATIONS: IEip7702DelegationDemo[] = [
  {
    networkId: 'evm--1',
    delegateAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
    label: 'MetaMask',
    logoURI: 'https://uni.onekey-asset.com/static/logo/metamasklogo.png',
  },
  {
    networkId: 'evm--56',
    delegateAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
    label: 'MetaMask',
    logoURI: 'https://uni.onekey-asset.com/static/logo/metamasklogo.png',
  },
  {
    networkId: 'evm--42161',
    delegateAddress: '0x89046d34e70a65acab2152c26a0c8e493b5ba629',
    riskReason: 'Known phishing contract. Revoke now to protect your assets.',
  },
];

export function getEip7702DemoDelegations({
  networkId,
  isAllNetworks,
}: {
  networkId: string;
  isAllNetworks: boolean;
}): IEip7702DelegationDemo[] {
  if (!platformEnv.isDev) {
    return [];
  }
  return isAllNetworks
    ? EIP7702_DEMO_DELEGATIONS
    : EIP7702_DEMO_DELEGATIONS.filter((d) => d.networkId === networkId);
}

// Demo stand-in for the home More dot's review record: a risky delegation
// lights the dot until Approvals is opened once in this session. The real
// build would persist it with the existing risk review and resurface interval.
let demoRiskDotSeen = false;

export function isEip7702DemoRiskDotSeen() {
  return demoRiskDotSeen;
}

export function markEip7702DemoRiskDotSeen() {
  demoRiskDotSeen = true;
}
