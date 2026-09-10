// Bound at module load, after the demo entry's platform polyfills and before
// any wallet request interceptor. Do not use the global `fetch` identifier
// later — other kit modules must not replace this binding for localhost HTTP.
export const demoFetch: typeof fetch = globalThis.fetch.bind(globalThis);

export const PRIME_DEMO_LOCAL_ORIGIN = 'http://localhost:4737';
