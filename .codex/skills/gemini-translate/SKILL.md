---
name: gemini-translate
description: Translate text, documents, and UI/i18n strings through the local Gemini CLI, including batch JSON, glossary-aware locale fills, and 1k-i18n drafts. Not for Lokalise upload or editing generated locale files.
---

# Gemini Translate

For translation tasks, use this skill's CLI. Put ordinary text or document paragraphs into items as well as UI strings. Do not call Gemini yourself, do not silently translate when the API fails, do not upload to Lokalise, and do not edit generated locale JSON/`translations.ts`/`localeJsonMap.ts`.

## Run

From this skill directory (`npm ci` if `node_modules` is missing):

```bash
node scripts/cli.mjs --input <in.json> --output <out.json>
node scripts/cli.mjs --input <in.json> --output <out.json> --model gemini-3.5-flash-lite
node scripts/cli.mjs --input <in.json> --output <out.json> --project client
```

Default is `gemini-3.8-flash` with low thinking. Other allowed ids are `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite`; never fall back to another model. Explicit lite with no `--thinking` omits thinkingConfig (provider default). Explicit `--thinking` overrides. Allowed values are in [references/cli.md](references/cli.md).

`--project client` or `--project server` resolves **all** current Lokalise languages (including the base language) on each run via read-only REST. Keep `sourceLanguage` in the input. Omit `targetLanguages`, or pass the exact live set; any other list fails before Gemini. Preserve API `lang_iso` codes exactly (`zh_CN` vs `zh-cn`). Without `--project`, existing explicit `targetLanguages` mode is unchanged and Lokalise credentials are not required. With `--project`, output includes `project: {alias,id,name,baseLanguage}`. Do not send Lokalise tokens to Gemini. A Lokalise read failure is fatal: no guessed locales, no model call, no `--output`.

Input is `{sourceLanguage, targetLanguages?, context?, glossary?, items:[{id,text,context?}]}`. Put project-approved terminology in `glossary` when the project has one. Output translations keep those ids and language codes exactly, plus `usageMetadata`, `model`, and `elapsedMs`. Language codes are not normalized (`zh-CN` vs `zh_CN`). `elapsedMs` is API time plus retries only. `usageMetadata` is from the final successful response, not summed retry billing. If `reviewRequired` is present, review those ICU strings before applying translations downstream.

For fixed-prompt boundaries and per-page context, read [references/prompting.md](references/prompting.md) when preparing UI translation batches.

A sample batch is `fixtures/sample-input.json`. Full flags, schemas, retry/timeout, and validation are in [references/cli.md](references/cli.md).

For UI/UX copy, include the UI role (button, label, status, or warning), business context, and any known per-locale length budget in each item context. Request concise interface wording without explanations or parenthetical definitions. Preserve actions, negations, conditions, and whether an event has already happened; brevity must not change meaning. Review returned lengths separately: this CLI does not enforce character budgets or prove that text fits the rendered page.

## With 1k-i18n

For OneKey tasks, read [references/onekey-locales-ui.md](references/onekey-locales-ui.md) for English/Simplified/Taiwan/Hong Kong review priorities, live terminology sources, `{number}`-style placeholders, and the boundary between translation and layout implementation.

When the task is OneKey module i18n, `1k-i18n` still owns scan, preview, confirmation, and apply. Use this CLI only to fill missing locales in a draft/patch. Prefer `--project client` (app UI) or `--project server` (server errors) so the live language set is used; otherwise pass the draft's locale codes through unchanged. After `--output` succeeds, map rows back by id; do not apply or pull unless the user already confirmed that `1k-i18n` step.

## Failures

If the CLI exits non-zero, report the redacted error (it includes attempt timing when retries ran). Stop. Do not fill strings by hand, retry with a different model, or write a partial locale file.

## Personal fork and cloud environment

This skill is a personal customization on the user's fork `x`; do not include it in an upstream PR. Keep generated translation batches and outputs in an ignored task directory. Follow the user's English-first prototype workflow: translation and the complete `1k-i18n` upload process begin after the feature/copy is confirmed. This CLI performs translation and read-only Lokalise project/language lookup; it never uploads.

Project identifiers are configured through `LOKALISE_PROJECT_ID_CLIENT` (or `LOKALISE_PROJECT_ID`) and `LOKALISE_PROJECT_ID_SERVER`. No real project identifier or credential is committed. Cloud secrets may use the user's existing `LOKALISE_API_KEY` binding; activate the environment's alias to `LOKALISE_TOKEN` before using this CLI or repository i18n scripts. Never put key values in files, logs, commits or prompts.

On this cloud machine, activate `/workspace/.cloud-setup/personal-skills-env.sh`, then run the CLI with `node --use-env-proxy scripts/cli.mjs ...` so API requests use the inherited proxy and CA trust. Keep TLS verification enabled. `npm ci --ignore-scripts` installs the locked dependencies without using bundled vendor files.
