import type { ITransactionSecurityCheckResultRaw } from '@onekeyhq/shared/types/transactionSecurity';

import { DEFAULT_PRIME_DEMO_FIXTURE } from './defaultFixture';
import { demoFetch } from './demoFetch';
import {
  getTransactionSecurityDemoRequestParams,
  parsePermitSingleTypedData,
} from './transactionSecurityDemoModel';
import {
  DEFAULT_PRIME_DEMO_FIXTURE_URL,
  DEFAULT_TRANSACTION_SECURITY_SCAN_DELAY_MS,
  type IPrimeDemoAssetChange,
  type IPrimeDemoFixture,
  type IPrimeDemoLoadedFixture,
  type ITransactionSecurityDemoFixture,
  PRIME_DEMO_SCENE_SIGNGUARD_PERMIT2,
  PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK,
} from './types';

export class PrimeDemoFixtureLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrimeDemoFixtureLoadError';
  }
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new PrimeDemoFixtureLoadError(
      `Fixture missing string field "${key}"`,
    );
  }
  return value;
}

function requireAssetChange(
  value: unknown,
  key: string,
): IPrimeDemoAssetChange {
  if (!value || typeof value !== 'object') {
    throw new PrimeDemoFixtureLoadError(
      `Fixture missing object field "${key}"`,
    );
  }
  const record = value as Record<string, unknown>;
  return {
    symbol: requireString(record, 'symbol'),
    amount: requireString(record, 'amount'),
  };
}

function requireObject(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PrimeDemoFixtureLoadError(
      `Fixture missing object field "${key}"`,
    );
  }
  return value as Record<string, unknown>;
}

function requireScanDelayMs(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_TRANSACTION_SECURITY_SCAN_DELAY_MS;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new PrimeDemoFixtureLoadError(
      'Fixture scanDelayMs must be a finite number >= 0',
    );
  }
  if (value > 30_000) {
    throw new PrimeDemoFixtureLoadError('Fixture scanDelayMs must be <= 30000');
  }
  return value;
}

export function parsePrimeDemoFixture(value: unknown): IPrimeDemoFixture {
  if (!value || typeof value !== 'object') {
    throw new PrimeDemoFixtureLoadError('Fixture JSON is not an object');
  }
  const record = value as Record<string, unknown>;
  return {
    title: requireString(record, 'title'),
    origin: requireString(record, 'origin'),
    accountAddress: requireString(record, 'accountAddress'),
    accountLabel: requireString(record, 'accountLabel'),
    networkName: requireString(record, 'networkName'),
    approveLabel: requireString(record, 'approveLabel'),
    approveAmount: requireString(record, 'approveAmount'),
    approveSymbol: requireString(record, 'approveSymbol'),
    outgoing: requireAssetChange(record.outgoing, 'outgoing'),
    incoming: requireAssetChange(record.incoming, 'incoming'),
  };
}

export function parseTransactionSecurityDemoFixture(
  value: unknown,
): ITransactionSecurityDemoFixture {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PrimeDemoFixtureLoadError('Fixture JSON is not an object');
  }
  const record = value as Record<string, unknown>;
  if (record.scene !== PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK) {
    throw new PrimeDemoFixtureLoadError(
      `Fixture scene must be "${PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK}"`,
    );
  }
  const dapp = requireObject(record.dapp, 'dapp');
  const request = requireObject(record.request, 'request');
  const securityResponse = requireObject(
    record.securityResponse,
    'securityResponse',
  );
  const detail = requireObject(
    securityResponse.detail,
    'securityResponse.detail',
  );
  if (detail.code !== 'malicious_approval') {
    throw new PrimeDemoFixtureLoadError(
      'Fixture securityResponse.detail.code must be "malicious_approval"',
    );
  }
  if (!Array.isArray(detail.features) || detail.features.length < 3) {
    throw new PrimeDemoFixtureLoadError(
      'Fixture securityResponse.detail.features must include at least 3 rows',
    );
  }
  if (detail.features.length > 8) {
    throw new PrimeDemoFixtureLoadError(
      'Fixture securityResponse.detail.features exceeds bound of 8',
    );
  }
  if (request.method !== 'eth_signTypedData_v4') {
    throw new PrimeDemoFixtureLoadError(
      'Fixture request.method must be eth_signTypedData_v4',
    );
  }
  if (!Array.isArray(request.params) || request.params.length !== 2) {
    throw new PrimeDemoFixtureLoadError(
      'Fixture request.params must be [accountAddress, typedData]',
    );
  }
  const parsedRequest: ITransactionSecurityDemoFixture['request'] = {
    method: 'eth_signTypedData_v4',
    params:
      request.params as ITransactionSecurityDemoFixture['request']['params'],
  };
  const metadata = requireObject(record.metadata, 'metadata');
  const fixture: ITransactionSecurityDemoFixture = {
    scene: PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK,
    title: requireString(record, 'title'),
    origin: requireString(record, 'origin'),
    accountAddress: requireString(record, 'accountAddress'),
    accountLabel: requireString(record, 'accountLabel'),
    networkName: requireString(record, 'networkName'),
    scanDelayMs: requireScanDelayMs(record.scanDelayMs),
    dapp: {
      name: requireString(dapp, 'name'),
      url: requireString(dapp, 'url'),
      ctaLabel: requireString(dapp, 'ctaLabel'),
      rewardAmount:
        typeof dapp.rewardAmount === 'string' && dapp.rewardAmount.trim()
          ? dapp.rewardAmount
          : undefined,
      rewardSymbol:
        typeof dapp.rewardSymbol === 'string' && dapp.rewardSymbol.trim()
          ? dapp.rewardSymbol
          : undefined,
    },
    request: parsedRequest,
    securityResponse: securityResponse as ITransactionSecurityCheckResultRaw,
    metadata: {
      provenance: requireString(metadata, 'provenance'),
      docsUrl: requireString(metadata, 'docsUrl'),
      liveBackend:
        typeof metadata.liveBackend === 'boolean'
          ? metadata.liveBackend
          : undefined,
      notes: typeof metadata.notes === 'string' ? metadata.notes : undefined,
    },
  };
  try {
    const [account] = getTransactionSecurityDemoRequestParams(fixture.request);
    parsePermitSingleTypedData(fixture.request.params[1]);
    if (account.toLowerCase() !== fixture.accountAddress.toLowerCase()) {
      throw new PrimeDemoFixtureLoadError(
        'Fixture request account must match accountAddress',
      );
    }
  } catch (error) {
    if (error instanceof PrimeDemoFixtureLoadError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new PrimeDemoFixtureLoadError(`Fixture request invalid: ${message}`);
  }
  return fixture;
}

export function parsePrimeDemoLoadedFixture(
  value: unknown,
): IPrimeDemoLoadedFixture {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PrimeDemoFixtureLoadError('Fixture JSON is not an object');
  }
  const record = value as Record<string, unknown>;
  if (record.scene === PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK) {
    return {
      scene: PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK,
      fixture: parseTransactionSecurityDemoFixture(value),
    };
  }
  if (
    record.scene !== undefined &&
    record.scene !== PRIME_DEMO_SCENE_SIGNGUARD_PERMIT2
  ) {
    throw new PrimeDemoFixtureLoadError(
      `Unsupported fixture scene ${JSON.stringify(record.scene)}`,
    );
  }
  return {
    scene: PRIME_DEMO_SCENE_SIGNGUARD_PERMIT2,
    fixture: parsePrimeDemoFixture(value),
  };
}

export function getPrimeDemoFixtureUrl() {
  return process.env.PRIME_DEMO_FIXTURE_URL || DEFAULT_PRIME_DEMO_FIXTURE_URL;
}

async function fetchPrimeDemoFixtureJson(): Promise<unknown> {
  const url = getPrimeDemoFixtureUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await demoFetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new PrimeDemoFixtureLoadError(
        `Fixture request failed ${response.status} ${response.statusText} (${url})`,
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof PrimeDemoFixtureLoadError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new PrimeDemoFixtureLoadError(
      `Fixture request failed (${url}): ${message}. Bundled default is ${DEFAULT_PRIME_DEMO_FIXTURE.outgoing.amount} ${DEFAULT_PRIME_DEMO_FIXTURE.outgoing.symbol} and is not used for automated takes.`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function loadPrimeDemoFixture(): Promise<IPrimeDemoFixture> {
  return parsePrimeDemoFixture(await fetchPrimeDemoFixtureJson());
}

export async function loadPrimeDemoLoadedFixture(): Promise<IPrimeDemoLoadedFixture> {
  return parsePrimeDemoLoadedFixture(await fetchPrimeDemoFixtureJson());
}
