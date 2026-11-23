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

// Delegations "revoked" from the demo confirm page in this session, so the
// list, tab dot and pill show what happens after a revoke.
const revokedKeys = new Set<string>();
const listeners = new Set<() => void>();
let snapshotVersion = 0;

function buildKey(d: { networkId: string; delegateAddress: string }) {
  return `${d.networkId}_${d.delegateAddress}`;
}

export function revokeEip7702DemoDelegation(d: {
  networkId: string;
  delegateAddress: string;
}) {
  revokedKeys.add(buildKey(d));
  snapshotVersion += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeEip7702DemoDelegations(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getEip7702DemoSnapshotVersion() {
  return snapshotVersion;
}

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
  return EIP7702_DEMO_DELEGATIONS.filter(
    (d) =>
      !revokedKeys.has(buildKey(d)) &&
      (isAllNetworks || d.networkId === networkId),
  );
}

// Demo stand-in for the home More dot's review record: a risky delegation
// lights the dot until Approvals is opened once in this session. The real
// build would persist it with the existing risk review and resurface interval.
// Tracked apart from the real record so a demo-only dot never writes it.
let demoRiskDotSeen = false;
let demoOnlyRiskDot = false;

export function isEip7702DemoRiskDotSeen() {
  return demoRiskDotSeen;
}

export function markEip7702DemoRiskDotSeen() {
  demoRiskDotSeen = true;
}

export function setEip7702DemoOnlyRiskDot(value: boolean) {
  demoOnlyRiskDot = value;
}

export function isEip7702DemoOnlyRiskDot() {
  return demoOnlyRiskDot;
}
