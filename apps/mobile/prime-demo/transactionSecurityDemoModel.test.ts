import fs from 'node:fs';
import path from 'node:path';

import { stableStringify } from '@onekeyhq/shared/src/utils/stringUtils';
import { normalizeTransactionSecurityResult } from '@onekeyhq/shared/src/utils/transactionSecurityUtils';
import { EHostSecurityLevel } from '@onekeyhq/shared/types/discovery';

import { DEFAULT_PRIME_DEMO_FIXTURE } from './defaultFixture';
import {
  parsePrimeDemoFixture,
  parsePrimeDemoLoadedFixture,
  parseTransactionSecurityDemoFixture,
} from './loadFixture';
import {
  TransactionSecurityDemoError,
  buildTransactionSecurityDemoCheckModel,
  buildTransactionSecurityDemoJsonRpc,
  buildTransactionSecurityDemoUnsignedMessage,
  buildTransactionSecurityDemoUrlSecurityInfo,
  formatUsdcPermitAmount,
  getTransactionSecurityDemoApproval,
  getTransactionSecurityDemoDappUrl,
  getTransactionSecurityDemoDisplayOrigin,
  isMatchingTransactionSecurityDemoRequest,
  parseTransactionSecurityDemoDappPreparedMessage,
  parseTransactionSecurityDemoEthereumRequestMessage,
  stringifyTypedData,
} from './transactionSecurityDemoModel';
import {
  PRIME_DEMO_SCENE_SIGNGUARD_PERMIT2,
  PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK,
  TRANSACTION_SECURITY_DEMO_FINDING_ID,
} from './types';

import type { ITransactionSecurityDemoFixture } from './types';
import type { IntlShape } from 'react-intl';

const intl = {
  formatMessage: ({ id }: { id?: string }) => id ?? '',
} as Pick<IntlShape, 'formatMessage'>;

const fixturePath = path.join(
  __dirname,
  '../../../development/prime-demo/features/transaction-security-check/fixture.json',
);

function loadCanonicalFixture() {
  return parseTransactionSecurityDemoFixture(
    JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as unknown,
  );
}

function withDisplayOrigin(
  fixture: ITransactionSecurityDemoFixture,
  origin: string,
): ITransactionSecurityDemoFixture {
  return { ...fixture, origin };
}

describe('transaction security demo fixture and model', () => {
  it('keeps the legacy SignGuard fixture parser unchanged', () => {
    const loaded = parsePrimeDemoLoadedFixture(DEFAULT_PRIME_DEMO_FIXTURE);
    expect(loaded.scene).toBe(PRIME_DEMO_SCENE_SIGNGUARD_PERMIT2);
    expect(parsePrimeDemoFixture(DEFAULT_PRIME_DEMO_FIXTURE)).toEqual(
      DEFAULT_PRIME_DEMO_FIXTURE,
    );
  });

  it('separates local transport from the synthetic display origin', () => {
    const fixture = loadCanonicalFixture();
    expect(getTransactionSecurityDemoDappUrl(fixture)).toBe(
      'http://localhost:4737/dapp',
    );
    expect(getTransactionSecurityDemoDisplayOrigin(fixture)).toBe(
      'https://rewards.example.com',
    );
    expect(
      getTransactionSecurityDemoDisplayOrigin(
        withDisplayOrigin(fixture, 'http://localhost:4737/dapp'),
      ),
    ).toBe('http://localhost:4737/dapp');
  });

  it('accepts a local WebView request and rejects a remote source', () => {
    const fixture = loadCanonicalFixture();
    const local = parseTransactionSecurityDemoEthereumRequestMessage({
      type: 'prime-demo-ethereum-request',
      source: 'http://localhost:4737/dapp/',
      method: 'eth_signTypedData_v4',
      params: [
        fixture.accountAddress,
        JSON.stringify(fixture.request.params[1]),
      ],
    });
    expect(
      isMatchingTransactionSecurityDemoRequest({ fixture, incoming: local }),
    ).toBe(true);

    expect(() =>
      parseTransactionSecurityDemoEthereumRequestMessage({
        type: 'prime-demo-ethereum-request',
        source: 'https://rewards.example.com/',
        method: 'eth_signTypedData_v4',
        params: local.params,
      }),
    ).toThrow(TransactionSecurityDemoError);
  });

  it('accepts a prepared local dApp layout message and rejects empty layout', () => {
    const prepared = parseTransactionSecurityDemoDappPreparedMessage({
      type: 'prime-demo-dapp-prepared',
      source: 'http://localhost:4737/dapp',
      title: 'Rewards',
      url: 'http://localhost:4737/dapp/',
      method: 'eth_signTypedData_v4',
      layout: { width: 353, height: 48 },
      localPoint: { x: 196.5, y: 220 },
    });
    expect(prepared.layout).toEqual({ width: 353, height: 48 });
    expect(prepared.localPoint).toEqual({ x: 196.5, y: 220 });

    expect(() =>
      parseTransactionSecurityDemoDappPreparedMessage({
        type: 'prime-demo-dapp-prepared',
        source: 'http://localhost:4737/dapp',
        title: 'Rewards',
        url: 'http://localhost:4737/dapp/',
        method: 'eth_signTypedData_v4',
        layout: { width: 0, height: 0 },
      }),
    ).toThrow(TransactionSecurityDemoError);
  });

  it('parses the canonical PermitSingle fixture and keeps the finding id stable', () => {
    const fixture = loadCanonicalFixture();
    expect(fixture.scene).toBe(PRIME_DEMO_SCENE_TRANSACTION_SECURITY_CHECK);
    expect(fixture.securityResponse.detail?.code).toBe('malicious_approval');
    expect(fixture.metadata?.provenance).toBe('synthetic-demonstration');

    const jsonRpc = buildTransactionSecurityDemoJsonRpc(fixture);
    const unsignedMessage =
      buildTransactionSecurityDemoUnsignedMessage(fixture);
    const typedData = stringifyTypedData(fixture.request.params[1]);

    expect(jsonRpc.method).toBe('eth_signTypedData_v4');
    expect(jsonRpc.params[0]).toBe(fixture.accountAddress);
    expect(jsonRpc.params[1]).toBe(typedData);
    expect(unsignedMessage.message).toBe(typedData);
    expect(jsonRpc.params[1]).toBe(stableStringify(fixture.request.params[1]));
  });

  it('derives USDC display from the PermitSingle amount', () => {
    expect(
      formatUsdcPermitAmount(
        '1461501637330902918203684832716283019655932542975',
      ),
    ).toBe('Unlimited');
    expect(formatUsdcPermitAmount('100000000')).toBe('100');
    expect(formatUsdcPermitAmount('1500000')).toBe('1.5');

    const fixture = loadCanonicalFixture();
    const approval = getTransactionSecurityDemoApproval(fixture);
    expect(approval.symbol).toBe('USDC');
    expect(approval.amountLabel).toBe('Unlimited');
    expect(approval.spender.toLowerCase()).toBe(
      '0x111122223333444455556666777788889999aaaa',
    );

    const finiteTypedData = structuredClone(fixture.request.params[1]) as {
      message: { details: { amount: string } };
    };
    finiteTypedData.message.details.amount = '100000000';
    expect(
      getTransactionSecurityDemoApproval({
        ...fixture,
        request: {
          ...fixture.request,
          params: [fixture.request.params[0], finiteTypedData],
        },
      }).amountLabel,
    ).toBe('100');
  });

  it('uses an unverified site check and still returns the high-risk request finding', () => {
    const fixture = loadCanonicalFixture();
    const site = buildTransactionSecurityDemoUrlSecurityInfo(fixture);
    expect(site.level).toBe(EHostSecurityLevel.Unknown);
    expect(site.level).not.toBe(EHostSecurityLevel.Security);

    const pending = buildTransactionSecurityDemoCheckModel({
      fixture,
      intl,
      sceneKey: 'scene-1',
      isScanPending: true,
    });
    expect(pending.status).toBe('loading');
    expect(pending.findings).toEqual([]);
    expect(pending.isPending).toBe(true);
    expect(pending.confirmation).toBe('pending');
    expect(pending.coverage).toEqual([
      { source: 'site', state: 'pending' },
      { source: 'parser', state: 'pending' },
      { source: 'requestScan', state: 'pending' },
    ]);

    const result = normalizeTransactionSecurityResult(fixture.securityResponse);
    expect(result?.level).toBe(EHostSecurityLevel.High);
    expect(
      result?.detail.features.some(
        (feature) => feature.code === 'unlimited_approval',
      ),
    ).toBe(false);
    expect(
      result?.detail.features.some(
        (feature) => feature.code === 'high_risk_spender',
      ),
    ).toBe(true);

    const model = buildTransactionSecurityDemoCheckModel({
      fixture,
      intl,
      sceneKey: 'scene-1',
      isScanPending: false,
    });
    expect(model.status).toBe('critical');
    expect(model.confirmation).toBe('risk');
    expect(model.isPending).toBe(false);
    expect(model.findings.some((finding) => finding.id === 'site-high')).toBe(
      false,
    );
    expect(
      model.findings.some((finding) => finding.id === 'site-unknown'),
    ).toBe(false);
    expect(
      model.findings.some((finding) => finding.id === 'message-permit'),
    ).toBe(true);
    expect(
      model.findings.some(
        (finding) => finding.id === TRANSACTION_SECURITY_DEMO_FINDING_ID,
      ),
    ).toBe(true);
    expect(model.coverage).toEqual([
      { source: 'site', state: 'unknown' },
      { source: 'parser', state: 'completed' },
      { source: 'requestScan', state: 'completed' },
    ]);
  });
});
