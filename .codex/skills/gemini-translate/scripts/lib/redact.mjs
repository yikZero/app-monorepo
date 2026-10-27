const KEY_PATTERNS = [
  /AIza[0-9A-Za-z_-]{10,}/g,
  /(?<=(?:^|[?&])key=)[^&\s'"]+/gi,
  /(?<=x-goog-api-key\s*[:=]\s*)[^\s'"]+/gi,
  /(?<=x-api-token\s*[:=]\s*)[^\s'"]+/gi,
  /(?<=Bearer\s+)[^\s'"]+/gi,
];
export function redact(value, secrets = []) {
  if (value === null || value === undefined) return '';
  let out = typeof value === 'string' ? value : stringifyUnknown(value);
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 4) {
      out = out.split(secret).join('[redacted]');
    }
  }
  for (const pattern of KEY_PATTERNS) {
    out = out.replace(pattern, '[redacted]');
  }
  return out;
}
function stringifyUnknown(value) {
  if (value instanceof Error) {
    return value.message || String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
export function toPublicError(err, secrets = []) {
  const out = new Error(redact(err?.message || String(err), secrets));
  out.name = 'TranslateError';
  if (typeof err?.status === 'number') out.status = err.status;
  if (typeof err?.attempts === 'number') out.attempts = err.attempts;
  if (typeof err?.retries === 'number') out.retries = err.retries;
  if (typeof err?.elapsedMs === 'number') out.elapsedMs = err.elapsedMs;
  if (Array.isArray(err?.attemptElapsedMs)) {
    out.attemptElapsedMs = err.attemptElapsedMs;
  }
  return out;
}
