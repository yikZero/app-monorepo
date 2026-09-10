import type { IUnsignedMessage } from '@onekeyhq/core/src/types';
import {
  type ISecurityCheckViewModel,
  buildSecurityCheckModel,
} from '@onekeyhq/kit/src/views/SignatureConfirm/components/SecurityCheckCard/securityCheckModel';
import { stableStringify } from '@onekeyhq/shared/src/utils/stringUtils';
import {
  buildTransactionSecurityJsonRpc,
  normalizeTransactionSecurityResult,
} from '@onekeyhq/shared/src/utils/transactionSecurityUtils';
import {
  EHostSecurityLevel,
  type IHostSecurity,
} from '@onekeyhq/shared/types/discovery';
import { EMessageTypesEth } from '@onekeyhq/shared/types/message';
import type { ISignatureConfirmDisplay } from '@onekeyhq/shared/types/signatureConfirm';
import type { ITransactionSecurityJsonRpc } from '@onekeyhq/shared/types/transactionSecurity';

import { PRIME_DEMO_LOCAL_ORIGIN } from './demoFetch';
import {
  DEFAULT_TRANSACTION_SECURITY_SCAN_DELAY_MS,
  type ITransactionSecurityDemoFixture,
  type ITransactionSecurityDemoRequest,
  PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK,
  TRANSACTION_SECURITY_DEMO_DAPP_PREPARED_TYPE,
  TRANSACTION_SECURITY_DEMO_DAPP_READY_TYPE,
  TRANSACTION_SECURITY_DEMO_ETHEREUM_REQUEST_TYPE,
} from './types';

import type { IntlShape } from 'react-intl';

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const UINT160_MAX = (1n << 160n) - 1n;
const USDC_DECIMALS = 6;
const USDC_ETH_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const PERMIT2_ADDRESS = '0x000000000022d473030f116ddee9f6b43ac78ba3';

type IIntl = Pick<IntlShape, 'formatMessage'>;

export class TransactionSecurityDemoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionSecurityDemoError';
  }
}

export type IPermitSingleTypedData = {
  primaryType: 'PermitSingle';
  domain: {
    name?: unknown;
    chainId?: unknown;
    verifyingContract?: unknown;
  };
  message: {
    details: {
      token: string;
      amount: string;
      expiration?: unknown;
      nonce?: unknown;
    };
    spender: string;
    sigDeadline?: unknown;
  };
};

export type ITransactionSecurityDemoDappPreparedMessage = {
  type: typeof TRANSACTION_SECURITY_DEMO_DAPP_PREPARED_TYPE;
  source: string;
  title: string;
  url: string;
  method: 'eth_signTypedData_v4';
  layout: { width: number; height: number };
  localPoint?: { x: number; y: number };
};

export type ITransactionSecurityDemoDappReadyMessage = {
  type: typeof TRANSACTION_SECURITY_DEMO_DAPP_READY_TYPE;
  source: string;
  title: string;
  url: string;
  method: 'eth_signTypedData_v4';
  localPoint: { x: number; y: number };
};

export type ITransactionSecurityDemoEthereumRequestMessage = {
  type: typeof TRANSACTION_SECURITY_DEMO_ETHEREUM_REQUEST_TYPE;
  source: string;
  method: 'eth_signTypedData_v4';
  params: [string, string];
};

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TransactionSecurityDemoError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireStringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TransactionSecurityDemoError(
      `${label} must be a non-empty string`,
    );
  }
  return value;
}

function requireAddress(value: unknown, label: string): string {
  const address = requireStringValue(value, label);
  if (!EVM_ADDRESS_RE.test(address)) {
    throw new TransactionSecurityDemoError(
      `${label} must be a 20-byte hex address`,
    );
  }
  return address;
}

function isLocalTransportHost(hostname: string, port: string) {
  return (
    (hostname === 'localhost' || hostname === '127.0.0.1') && port === '4737'
  );
}

export function normalizeLocalTransportUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TransactionSecurityDemoError(`Invalid local dApp URL: ${value}`);
  }
  if (parsed.protocol !== 'http:') {
    throw new TransactionSecurityDemoError(
      `Local dApp URL must use http: ${value}`,
    );
  }
  if (!isLocalTransportHost(parsed.hostname, parsed.port)) {
    throw new TransactionSecurityDemoError(
      `Local dApp URL must be localhost:4737: ${value}`,
    );
  }
  let pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/dapp/index.html') {
    pathname = '/dapp';
  }
  if (pathname !== '/dapp') {
    throw new TransactionSecurityDemoError(
      `Local dApp URL path must be /dapp: ${value}`,
    );
  }
  return `${PRIME_DEMO_LOCAL_ORIGIN}/dapp`;
}

export function getTransactionSecurityDemoDappUrl(
  fixture: ITransactionSecurityDemoFixture,
) {
  return normalizeLocalTransportUrl(fixture.dapp.url);
}

export function getTransactionSecurityDemoDisplayOrigin(
  fixture: ITransactionSecurityDemoFixture,
) {
  let parsed: URL;
  try {
    parsed = new URL(fixture.origin);
  } catch {
    throw new TransactionSecurityDemoError(
      `Invalid display origin: ${fixture.origin}`,
    );
  }
  if (isLocalTransportHost(parsed.hostname, parsed.port)) {
    return normalizeLocalTransportUrl(fixture.origin);
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname) {
    throw new TransactionSecurityDemoError(
      `Display origin must be https or the local dApp transport: ${fixture.origin}`,
    );
  }
  return parsed.origin;
}

export function getTransactionSecurityDemoDisplayHost(
  fixture: ITransactionSecurityDemoFixture,
) {
  const origin = getTransactionSecurityDemoDisplayOrigin(fixture);
  return origin.replace(/^https:\/\//i, '');
}

export function stringifyTypedData(value: unknown): string {
  const parsed =
    typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
  return stableStringify(parsed);
}

export function parsePermitSingleTypedData(
  value: unknown,
): IPermitSingleTypedData {
  const raw =
    typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
  const record = asRecord(raw, 'typed data');
  if (record.primaryType !== 'PermitSingle') {
    throw new TransactionSecurityDemoError(
      'typed data primaryType must be PermitSingle',
    );
  }
  const domain = asRecord(record.domain, 'typed data domain');
  const message = asRecord(record.message, 'typed data message');
  const details = asRecord(message.details, 'typed data message.details');
  const token = requireAddress(details.token, 'typed data token');
  const spender = requireAddress(message.spender, 'typed data spender');
  const amount = requireStringValue(details.amount, 'typed data amount');
  if (token.toLowerCase() !== USDC_ETH_ADDRESS) {
    throw new TransactionSecurityDemoError(
      'typed data token must be Ethereum USDC',
    );
  }
  if (!/^[0-9]+$/.test(amount)) {
    throw new TransactionSecurityDemoError(
      'typed data amount must be a non-negative integer string',
    );
  }
  let amountValue: bigint;
  try {
    amountValue = BigInt(amount);
  } catch {
    throw new TransactionSecurityDemoError(
      'typed data amount is not an integer',
    );
  }
  if (amountValue > UINT160_MAX) {
    throw new TransactionSecurityDemoError('typed data amount exceeds uint160');
  }
  const verifyingContract = requireAddress(
    domain.verifyingContract,
    'typed data verifyingContract',
  );
  if (verifyingContract.toLowerCase() !== PERMIT2_ADDRESS) {
    throw new TransactionSecurityDemoError(
      'typed data verifyingContract must be Permit2',
    );
  }
  return {
    primaryType: 'PermitSingle',
    domain: {
      name: domain.name,
      chainId: domain.chainId,
      verifyingContract,
    },
    message: {
      details: {
        token,
        amount,
        expiration: details.expiration,
        nonce: details.nonce,
      },
      spender,
      sigDeadline: message.sigDeadline,
    },
  };
}

export function getTransactionSecurityDemoRequestParams(
  request: ITransactionSecurityDemoRequest,
): [string, string] {
  if (request.method !== 'eth_signTypedData_v4') {
    throw new TransactionSecurityDemoError(
      `Unsupported demo request method ${String(request.method)}`,
    );
  }
  if (!Array.isArray(request.params) || request.params.length !== 2) {
    throw new TransactionSecurityDemoError(
      'Demo request params must be [address, typedData]',
    );
  }
  const account = requireAddress(request.params[0], 'request account');
  const message = stringifyTypedData(request.params[1]);
  parsePermitSingleTypedData(message);
  return [account, message];
}

export function buildTransactionSecurityDemoUnsignedMessage(
  fixture: ITransactionSecurityDemoFixture,
): IUnsignedMessage {
  const [account, message] = getTransactionSecurityDemoRequestParams(
    fixture.request,
  );
  return {
    type: EMessageTypesEth.TYPED_DATA_V4,
    message,
    payload: [account, message],
  };
}

export function buildTransactionSecurityDemoJsonRpc(
  fixture: ITransactionSecurityDemoFixture,
): ITransactionSecurityJsonRpc {
  const unsignedMessage = buildTransactionSecurityDemoUnsignedMessage(fixture);
  const [account, message] = getTransactionSecurityDemoRequestParams(
    fixture.request,
  );
  const jsonRpc = buildTransactionSecurityJsonRpc({
    jsonRpcRequest: {
      method: fixture.request.method,
      params: [account, message],
    },
    unsignedMessage,
  });
  if (!jsonRpc) {
    throw new TransactionSecurityDemoError(
      'Fixture request is not a scannable eth_signTypedData_v4 payload',
    );
  }
  return jsonRpc;
}

export function buildTransactionSecurityDemoUrlSecurityInfo(
  fixture: ITransactionSecurityDemoFixture,
): IHostSecurity {
  const origin = getTransactionSecurityDemoDisplayOrigin(fixture);
  return {
    host: new URL(origin).host,
    level: EHostSecurityLevel.Unknown,
    attackTypes: [],
    phishingSite: false,
    checkSources: [],
    alert: '',
    projectName: fixture.dapp.name,
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

export function buildTransactionSecurityDemoMessageDisplay(
  fixture: ITransactionSecurityDemoFixture,
): ISignatureConfirmDisplay {
  return {
    title: fixture.title,
    components: [],
    alerts: [],
  };
}

export function getTransactionSecurityDemoScanDelayMs(
  fixture: ITransactionSecurityDemoFixture,
) {
  return Number.isFinite(fixture.scanDelayMs)
    ? Math.max(0, fixture.scanDelayMs)
    : DEFAULT_TRANSACTION_SECURITY_SCAN_DELAY_MS;
}

export function buildTransactionSecurityDemoCheckModel({
  fixture,
  intl,
  sceneKey,
  isScanPending,
}: {
  fixture: ITransactionSecurityDemoFixture;
  intl: IIntl;
  sceneKey: string;
  isScanPending: boolean;
}): ISecurityCheckViewModel {
  const unsignedMessage = buildTransactionSecurityDemoUnsignedMessage(fixture);
  const jsonRpc = buildTransactionSecurityDemoJsonRpc(fixture);
  const transactionSecurityInfo = isScanPending
    ? undefined
    : normalizeTransactionSecurityResult(fixture.securityResponse);
  if (!isScanPending && !transactionSecurityInfo) {
    throw new TransactionSecurityDemoError(
      'Fixture securityResponse did not normalize to a usable Prime result',
    );
  }
  const model = buildSecurityCheckModel({
    kind: 'message',
    requestKey: `${sceneKey}|${jsonRpc.method}`,
    origin: getTransactionSecurityDemoDisplayOrigin(fixture),
    urlSecurityInfo: isScanPending
      ? undefined
      : buildTransactionSecurityDemoUrlSecurityInfo(fixture),
    messageDisplay: isScanPending
      ? undefined
      : buildTransactionSecurityDemoMessageDisplay(fixture),
    unsignedMessage: isScanPending ? undefined : unsignedMessage,
    isMessageParseFallback: false,
    isParserPending: isScanPending,
    isConfirmationRequired: false,
    transactionSecurityInfo,
    isTransactionSecurityPending: isScanPending,
    isTransactionSecurityApplicable: true,
    isPrimeUser: true,
    intl,
  });
  // Demo summarizes site status in coverage, so omit the standalone Unverified row.
  return {
    ...model,
    findings: model.findings.filter((finding) => finding.id !== 'site-unknown'),
  };
}

export function formatUsdcPermitAmount(amount: string): string {
  const amountValue = BigInt(amount);
  if (amountValue >= UINT160_MAX) {
    return 'Unlimited';
  }
  const base = 10n ** BigInt(USDC_DECIMALS);
  const whole = amountValue / base;
  const fraction = amountValue % base;
  if (fraction === 0n) {
    return whole.toString();
  }
  const fractionText = fraction
    .toString()
    .padStart(USDC_DECIMALS, '0')
    .replace(/0+$/, '');
  return `${whole.toString()}.${fractionText}`;
}

export function getTransactionSecurityDemoApproval(
  fixture: ITransactionSecurityDemoFixture,
) {
  const typedData = parsePermitSingleTypedData(fixture.request.params[1]);
  const amount = typedData.message.details.amount;
  return {
    amount,
    amountLabel: formatUsdcPermitAmount(amount),
    symbol: 'USDC',
    spender: typedData.message.spender,
    token: typedData.message.details.token,
  };
}

function parseLocalPoint(value: unknown): { x: number; y: number } {
  const record = asRecord(value, 'localPoint');
  const x = record.x;
  const y = record.y;
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw new TransactionSecurityDemoError(
      'localPoint.x and localPoint.y must be finite numbers',
    );
  }
  return { x, y };
}

function parseDappDocumentFields(record: Record<string, unknown>) {
  const source = normalizeLocalTransportUrl(
    requireStringValue(record.source, 'source'),
  );
  const url = normalizeLocalTransportUrl(requireStringValue(record.url, 'url'));
  if (record.method !== 'eth_signTypedData_v4') {
    throw new TransactionSecurityDemoError(
      'dApp method must be eth_signTypedData_v4',
    );
  }
  return {
    source,
    title: requireStringValue(record.title, 'title'),
    url,
    method: 'eth_signTypedData_v4' as const,
  };
}

function parseLayout(value: unknown): { width: number; height: number } {
  const record = asRecord(value, 'layout');
  const width = record.width;
  const height = record.height;
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !(width > 0) ||
    !(height > 0)
  ) {
    throw new TransactionSecurityDemoError(
      'layout.width and layout.height must be positive finite numbers',
    );
  }
  return { width, height };
}

export function parseTransactionSecurityDemoDappPreparedMessage(
  value: unknown,
): ITransactionSecurityDemoDappPreparedMessage {
  const record = asRecord(value, 'dApp prepared message');
  if (record.type !== TRANSACTION_SECURITY_DEMO_DAPP_PREPARED_TYPE) {
    throw new TransactionSecurityDemoError(
      `Unexpected dApp message type ${String(record.type)}`,
    );
  }
  const document = parseDappDocumentFields(record);
  return {
    type: TRANSACTION_SECURITY_DEMO_DAPP_PREPARED_TYPE,
    ...document,
    layout: parseLayout(record.layout),
    ...(record.localPoint === undefined
      ? {}
      : { localPoint: parseLocalPoint(record.localPoint) }),
  };
}

export function parseTransactionSecurityDemoDappReadyMessage(
  value: unknown,
): ITransactionSecurityDemoDappReadyMessage {
  const record = asRecord(value, 'dApp ready message');
  if (record.type !== TRANSACTION_SECURITY_DEMO_DAPP_READY_TYPE) {
    throw new TransactionSecurityDemoError(
      `Unexpected dApp message type ${String(record.type)}`,
    );
  }
  return {
    type: TRANSACTION_SECURITY_DEMO_DAPP_READY_TYPE,
    ...parseDappDocumentFields(record),
    localPoint: parseLocalPoint(record.localPoint),
  };
}

export function parseTransactionSecurityDemoEthereumRequestMessage(
  value: unknown,
): ITransactionSecurityDemoEthereumRequestMessage {
  const record = asRecord(value, 'dApp request message');
  if (record.type !== TRANSACTION_SECURITY_DEMO_ETHEREUM_REQUEST_TYPE) {
    throw new TransactionSecurityDemoError(
      `Unexpected dApp message type ${String(record.type)}`,
    );
  }
  if (record.method !== 'eth_signTypedData_v4') {
    throw new TransactionSecurityDemoError(
      'dApp request method must be eth_signTypedData_v4',
    );
  }
  if (!Array.isArray(record.params) || record.params.length !== 2) {
    throw new TransactionSecurityDemoError(
      'dApp request params must be [address, typedData]',
    );
  }
  const account = requireAddress(record.params[0], 'dApp request account');
  const message = stringifyTypedData(record.params[1]);
  parsePermitSingleTypedData(message);
  return {
    type: TRANSACTION_SECURITY_DEMO_ETHEREUM_REQUEST_TYPE,
    source: normalizeLocalTransportUrl(
      requireStringValue(record.source, 'source'),
    ),
    method: 'eth_signTypedData_v4',
    params: [account, message],
  };
}

export function isMatchingTransactionSecurityDemoRequest({
  fixture,
  incoming,
}: {
  fixture: ITransactionSecurityDemoFixture;
  incoming: ITransactionSecurityDemoEthereumRequestMessage;
}) {
  const [account, message] = getTransactionSecurityDemoRequestParams(
    fixture.request,
  );
  return (
    incoming.method === fixture.request.method &&
    incoming.params[0].toLowerCase() === account.toLowerCase() &&
    incoming.params[1] === message &&
    incoming.source === getTransactionSecurityDemoDappUrl(fixture) &&
    fixture.scene === PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK
  );
}

export function parseTransactionSecurityDemoWebViewData(raw: string): unknown {
  if (raw.length > 50_000) {
    throw new TransactionSecurityDemoError('dApp message exceeds size bound');
  }
  return JSON.parse(raw) as unknown;
}
