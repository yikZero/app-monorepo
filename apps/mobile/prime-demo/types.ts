import type { ITransactionSecurityCheckResultRaw } from '@onekeyhq/shared/types/transactionSecurity';

export type IPrimeDemoAssetChange = {
  symbol: string;
  amount: string;
};

export type IPrimeDemoFixture = {
  title: string;
  origin: string;
  accountAddress: string;
  accountLabel: string;
  networkName: string;
  approveLabel: string;
  approveAmount: string;
  approveSymbol: string;
  outgoing: IPrimeDemoAssetChange;
  incoming: IPrimeDemoAssetChange;
};

export const PRIME_DEMO_SCENE_SIGNGUARD_PERMIT2 = 'signguard-permit2';

export const PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK =
  'transaction-security-check';

export type IPrimeDemoScene =
  | typeof PRIME_DEMO_SCENE_SIGNGUARD_PERMIT2
  | typeof PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK;

export type ITransactionSecurityDemoDapp = {
  name: string;
  url: string;
  ctaLabel: string;
  rewardAmount?: string;
  rewardSymbol?: string;
};

export type ITransactionSecurityDemoRequest = {
  method: 'eth_signTypedData_v4';
  params: [string, string | Record<string, unknown>];
};

export type ITransactionSecurityDemoMetadata = {
  provenance: string;
  liveBackend?: boolean;
  notes?: string;
  docsUrl?: string;
};

export type ITransactionSecurityDemoFixture = {
  scene: typeof PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK;
  title: string;
  origin: string;
  accountAddress: string;
  accountLabel: string;
  networkName: string;
  scanDelayMs: number;
  dapp: ITransactionSecurityDemoDapp;
  request: ITransactionSecurityDemoRequest;
  securityResponse: ITransactionSecurityCheckResultRaw;
  metadata?: ITransactionSecurityDemoMetadata;
};

export type IPrimeDemoLoadedFixture =
  | {
      scene: typeof PRIME_DEMO_SCENE_SIGNGUARD_PERMIT2;
      fixture: IPrimeDemoFixture;
    }
  | {
      scene: typeof PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK;
      fixture: ITransactionSecurityDemoFixture;
    };

export const DEFAULT_PRIME_DEMO_FIXTURE_URL =
  'http://localhost:4737/fixture.json';

export const DEFAULT_PRIME_DEMO_COMMAND_URL = 'http://localhost:4737/command';

export const DEFAULT_PRIME_DEMO_MARKERS_URL = 'http://localhost:4737/markers';

export const DEFAULT_PRIME_DEMO_RESET_URL = 'http://localhost:4737/reset';

export const DEFAULT_PRIME_DEMO_DAPP_URL = 'http://localhost:4737/dapp';

export const TRANSACTION_SECURITY_DEMO_DAPP_PREPARED_TYPE =
  'prime-demo-dapp-prepared';

export const TRANSACTION_SECURITY_DEMO_DAPP_READY_TYPE =
  'prime-demo-dapp-ready';

export const TRANSACTION_SECURITY_DEMO_ETHEREUM_REQUEST_TYPE =
  'prime-demo-ethereum-request';

export const TRANSACTION_SECURITY_DEMO_FINDING_ID =
  'tx-security-malicious_approval';

export const DEFAULT_TRANSACTION_SECURITY_SCAN_DELAY_MS = 1400;
