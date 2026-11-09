/* eslint-disable onekey/no-raw-error -- Standalone CLI uses native Node errors without the application runtime. */
import {
  MAX_RETRIES,
  TRANSIENT_CODES,
  TRANSIENT_STATUS,
} from './constants.mjs';

export function isTransientError(err) {
  if (!err || typeof err !== 'object') return false;
  if (typeof err.status === 'number' && TRANSIENT_STATUS.has(err.status))
    return true;
  if (typeof err.code === 'string' && TRANSIENT_CODES.has(err.code))
    return true;
  if (typeof err.name === 'string' && TRANSIENT_CODES.has(err.name))
    return true;
  const message = String(err.message || '').toLowerCase();
  if (message.includes('timeout') || message.includes('timed out')) return true;
  if (message.includes('rate limit') || message.includes('resource exhausted'))
    return true;
  if (message.includes('unavailable') || message.includes('econnreset'))
    return true;
  return false;
}

export function backoffMs(failedAttemptIndex) {
  return 500 * 2 ** failedAttemptIndex;
}

export async function withRetries(
  fn,
  {
    maxRetries = MAX_RETRIES,
    sleep = defaultSleep,
    now = Date.now,
    isTransient = isTransientError,
  } = {},
) {
  const attemptElapsedMs = [];
  const started = now();
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const attemptStart = now();
    try {
      const result = await fn(attempt);
      attemptElapsedMs.push(elapsed(now, attemptStart));
      return {
        result,
        attempts: attempt + 1,
        retries: attempt,
        attemptElapsedMs,
        elapsedMs: elapsed(now, started),
      };
    } catch (err) {
      attemptElapsedMs.push(elapsed(now, attemptStart));
      lastError = err;
      const attempts = attempt + 1;
      const retries = attempt;
      const elapsedMs = elapsed(now, started);
      attachTiming(err, { attempts, retries, attemptElapsedMs, elapsedMs });
      if (attempt === maxRetries || !isTransient(err)) {
        throw err;
      }
      await sleep(backoffMs(attempt));
    }
  }

  throw new Error('Translation retry loop ended without an attempt', {
    cause: lastError,
  });
}

function elapsed(now, start) {
  return Math.max(0, now() - start);
}

function attachTiming(err, timing) {
  if (!err || typeof err !== 'object') return;
  err.attempts = timing.attempts;
  err.retries = timing.retries;
  err.attemptElapsedMs = [...timing.attemptElapsedMs];
  err.elapsedMs = timing.elapsedMs;
}

function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
