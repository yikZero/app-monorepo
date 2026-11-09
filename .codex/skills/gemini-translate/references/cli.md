# gemini-translate CLI

Read this when you need input/output shape, flags, or validation details. Run the script; do not reimplement translation.

## Install and run

From this skill directory:

```bash
npm ci
node scripts/cli.mjs --input <in.json> --output <out.json>
node scripts/cli.mjs --input <in.json> --output <out.json> --model gemini-3.5-flash-lite
node scripts/cli.mjs --input <in.json> --output <out.json> --thinking medium
node scripts/cli.mjs --input <in.json> --output <out.json> --project client
node scripts/cli.mjs --input <in.json> --output <out.json> --project server
```

`--model` is `gemini-3.8-flash` when omitted. Other allowed ids are `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite`. There is no automatic model fallback.

Default thinking is `low` for `gemini-3.8-flash`. Explicit `gemini-3.5-flash-lite` with no `--thinking` omits `thinkingConfig` (provider default). Explicit `--thinking` overrides and maps to `thinkingConfig.thinkingLevel` (`MINIMAL`/`LOW`/`MEDIUM`/`HIGH`) with `includeThoughts: false`. Allowed values: `low|medium|high` for `gemini-3.8-flash`; `minimal|low|medium|high` for `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite`.

Credentials: `GEMINI_API_KEY`, else macOS Keychain `security find-generic-password` via `execFileSync` (no shell), service `gemini-translate`, account `gemini-api-key`. Never print keys.

`--project client|server` is optional. It GETs `https://api.lokalise.com/api2/projects/{id}` then `/languages?limit=500&page=1` (paginate while a page has 500 rows). Timeout 20s; redirects are errors. The helper is local to this skill (no repo import). `sourceLanguage` stays required. `targetLanguages` may be omitted; if provided, it must be the exact live set or the CLI fails before Gemini (no silent partial coverage). All languages includes the base language. Codes are the API `lang_iso` values with no normalization. Output adds `project: {alias,id,name,baseLanguage}`. Lokalise tokens are not sent to Gemini. A read/mapping failure produces no model call and no `--output`. Without `--project`, explicit `targetLanguages` mode is unchanged and Lokalise credentials are not read.

`--project` credentials: `LOKALISE_TOKEN`, else Keychain service `ENV-BIG-FE-APP-MONOREPO-DEV` account `LOKALISE_TOKEN` (same `execFileSync` rules). Configure client through `LOKALISE_PROJECT_ID_CLIENT` (or `LOKALISE_PROJECT_ID`), and server through `LOKALISE_PROJECT_ID_SERVER`; expected project names remain `Monorepo v5` and `server`. Live id and name must match. See `fixtures/sample-input-project.json` for a batch with `sourceLanguage` and no `targetLanguages`.

Timeout is 90s per attempt. Transient HTTP/network errors retry at most twice (3 attempts). SDK HTTP retries are disabled (`retryOptions.attempts: 1`) so timing is captured here. Output includes `elapsedMs` (API time plus retries only), `attempts`, `retries`, and `attemptElapsedMs`. `usageMetadata` is from the final successful response only, not total retry billing.

## Input

```json
{
  "sourceLanguage": "en",
  "targetLanguages": ["zh-CN", "ja", "de"],
  "context": "optional batch context",
  "glossary": { "OneKey": { "zh-CN": "OneKey" } },
  "items": [{ "id": "send_amount", "text": "Send {amount} {symbol}", "context": "optional" }]
}
```

Language codes are copied through exactly (`zh-CN` stays `zh-CN`; `zh_CN` stays `zh_CN`). When filling a `1k-i18n` draft, pass the draft's locale codes. Put project-approved terminology in `glossary` when the project has one.

See `fixtures/sample-input.json` for a 10-item English batch covering `{amount}`, `{symbol}`, repeated placeholders, and UI-role ambiguity.

## Output

```json
{
  "sourceLanguage": "en",
  "targetLanguages": ["zh-CN", "ja", "de"],
  "model": "gemini-3.8-flash",
  "thinking": "low",
  "elapsedMs": 1234,
  "attempts": 1,
  "retries": 0,
  "attemptElapsedMs": [1234],
  "usageMetadata": {
    "promptTokenCount": 0,
    "candidatesTokenCount": 0,
    "totalTokenCount": 0
  },
  "project": {
    "alias": "client",
    "id": "<configured-client-project-id>",
    "name": "Monorepo v5",
    "baseLanguage": "en_US"
  },
  "translations": [{ "id": "send_amount", "language": "zh-CN", "text": "发送 {amount} {symbol}" }]
}
```

`--output` is written only after validation succeeds. `project` is present only with `--project`. `usageMetadata` keeps numeric SDK fields from the final successful response when present (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, `thoughtsTokenCount`, `cachedContentTokenCount`, `toolUsePromptTokenCount`). It is not summed across retries.

## Validation

Checked after the model returns structured JSON (`responseMimeType: application/json` + `responseJsonSchema`):

- Every `items[].id` × `targetLanguages` entry exists
- No duplicate `(id, language)` pairs
- Translation text is non-empty
- Simple `{name}` tokens: each identifier's multiplicity matches the source (`{symbol}` twice stays twice)

Unbalanced braces are rejected as unsupported syntax. ICU MessageFormat (`plural` / `select` / nested braces / `#`) is **not** fully parser-validated. Those source strings are sent through, skipped for `{name}` multiplicity checks, and listed on `reviewRequired`. Review `reviewRequired` ICU strings before applying translations downstream.

## Failures

Non-zero exit. stderr is redacted (API keys, Lokalise tokens, `AIza…`, `key=` query params, `x-goog-api-key`, `x-api-token`, Bearer tokens). Do not invent translations, switch models, upload to Lokalise, or edit generated locale files.
