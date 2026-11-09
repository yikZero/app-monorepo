export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const LITE_MODEL = 'gemini-3.5-flash-lite';

export const MODELS = {
  'gemini-3.1-flash-lite': {
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
  },
  'gemini-3.8-flash': {
    thinkingLevels: ['low', 'medium', 'high'],
  },
  'gemini-3.5-flash-lite': {
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
  },
};

export function defaultThinkingFor(model) {
  return model === DEFAULT_MODEL ? 'low' : null;
}

export const REQUEST_TIMEOUT_MS = 90_000;
export const MAX_RETRIES = 2;
export const KEYCHAIN_SERVICE = 'gemini-translate';
export const KEYCHAIN_ACCOUNT = 'gemini-api-key';

export const LOKALISE_API_BASE = 'https://api.lokalise.com/api2';
export const LOKALISE_TIMEOUT_MS = 20_000;
export const LOKALISE_PAGE_LIMIT = 500;
export const LOKALISE_TOKEN_ENV = 'LOKALISE_TOKEN';
export const LOKALISE_KEYCHAIN_SERVICE = 'ENV-BIG-FE-APP-MONOREPO-DEV';
export const LOKALISE_KEYCHAIN_ACCOUNT = 'LOKALISE_TOKEN';

export const PROJECTS = {
  client: {
    alias: 'client',
    id:
      process.env.LOKALISE_PROJECT_ID_CLIENT ||
      process.env.LOKALISE_PROJECT_ID ||
      '',
    name: 'Monorepo v5',
  },
  server: {
    alias: 'server',
    id: process.env.LOKALISE_PROJECT_ID_SERVER || '',
    name: 'server',
  },
};

export const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);
export const TRANSIENT_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'AbortError',
  'TimeoutError',
]);
