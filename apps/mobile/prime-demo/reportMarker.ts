import { demoFetch } from './demoFetch';
import { DEFAULT_PRIME_DEMO_MARKERS_URL } from './types';

export function reportPrimeDemoMarker(payload: {
  name: string;
  tMs: number;
  sceneKey?: string;
  extra?: Record<string, unknown>;
}) {
  const body = {
    name: payload.name,
    tMs: payload.tMs,
    sceneKey: payload.sceneKey,
    clientNowMs: Date.now(),
    clientPerformanceNowMs: globalThis.performance.now(),
    extra: payload.extra,
  };
  void demoFetch(DEFAULT_PRIME_DEMO_MARKERS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch((error: unknown) => {
    console.warn(
      '[prime-demo] marker POST failed',
      payload.name,
      error instanceof Error ? error.message : error,
    );
  });
}
