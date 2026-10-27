# OneKey locales, terminology, and UI content

Apply this profile to OneKey UI/i18n tasks. Main review languages are English, Simplified Chinese, Taiwan Traditional Chinese and Hong Kong Traditional Chinese. This does not reduce a task that requires every project language.

## Verified project mapping

Use `--project client` or `--project server` so the CLI reads the current Lokalise language list each run (including the base language). Do not hardcode a frozen locale set. Preserve API `lang_iso` values exactly; do not convert `zh_CN` to `zh-cn` or the reverse.

- `client`: project id `<configured-client-project-id>`, name `Monorepo v5`, base `en_US` (underscore / region case as returned).
- `server`: project id `<configured-server-project-id>`, name `server`, base `en-us`. Server codes are hyphen lowercase (`zh-cn`, `zh-tw`, `zh-hk`).

On 2026-09-14, client had 19 languages and server 21; those counts are a snapshot, not a runtime allowlist. The primary review codes for client UI are `en_US`, `zh_CN`, `zh_TW`, `zh_HK`. `zh_TW` is Taiwan Traditional Chinese and `zh_HK` is Hong Kong Traditional Chinese. A conversational “tw” refers here to the Taiwan locale; never send `tw` as a fabricated project ISO. Other projects may use different codes.

Translate each variant idiomatically, not via mechanical character conversion. Preserve terminology shared by the product while respecting regional usage. Do not force Taiwan and Hong Kong strings to differ when the same wording is appropriate.

## Terminology sources

Fetch the live project glossary and only relevant existing keys; do not embed the whole translation catalog in a prompt. The official glossary endpoint is GET `/projects/{project_id}/glossary-terms`; honor pagination, translatable/forbidden/caseSensitive and per-locale entries. The 2026-09-14 snapshot had 46 terms. OneKey and WalletConnect are non-translatable; recovery phrase has 助记词 / 助記詞. A localized product term explicitly supplied by the glossary is an exception to generic “keep product names” advice.

Existing key samples (observations, not a new universal glossary):

| Source | zh_CN | zh_TW | zh_HK |
| --- | --- | --- | --- |
| Network (`global::network`) | 网络 | 網路 | 網絡 |
| Approve (`global::approve`) | 授权 | 授權 | 授權 |
| Account (`global::account`) | 帐户 | 帳戶 | 帳戶 |
| Settings (`global::settings`) | 设置 | 設定 | 設定 |

The sampled translations were `is_reviewed: false`; treat them as current consistency evidence, not independently approved terminology. The glossary contains older locale entries and regional choices (e.g. Chain has zh_TW 網絡); do not map these blindly onto another source concept or overwrite the glossary. Surface genuine conflicts and resolve within the task. Build the task's `glossary` using exact locale codes and matching meanings.

## Placeholder contract

For this app, plain variables use ICU-style single ASCII braces: `{number}`, `{amount}`, `{symbol}`, `{network}`. Preserve existing names, case, and occurrence counts, matching code call-site arguments. Do not rename every numeric argument to `{number}`, replace values with examples, localize names, or convert to `{{number}}`, `%s`, full-width braces, or HTML entities. Keep existing ICU plural/select and rich-text tags intact; do not flatten a plural into a plain string.

Observed remote examples: `batch_psbt_transaction_number__title` = `Transaction {number}`; `approve_edit::increase_allowance_by_amount` = `Increase {symbol} allowance by {amount}`. Preserve the same variables in every locale through preview, upload and pull. Lokalise can support other placeholder/export formats; this is the app contract, not a claim that Lokalise always stores one universal syntax.

## Translation vs page implementation

Translation rules derived from the user's [Vercel content guidelines](https://vercel.com/design/guidelines#content):
- Concise, meaningful titles, statuses, action labels, inline help and accessible names when those source strings are provided. Keep a supplied recovery action. If the source lacks one, flag the design gap separately instead of inventing a navigation path in the translation.
- Prefer locale-appropriate typographic quotes and … in UI prose; leave code/identifiers/URLs exact. English curly quotes are not a universal replacement for Chinese regional quotation conventions. An ellipsis must not conceal omitted meaning.
- Translate accessible labels by purpose, not by icon appearance. Do not add visible labels or ARIA markup to string values.
- Preserve formatting variables; application formatters own locale-aware dates, numbers, currencies and delimiters. Keep protected terms exact; `translate="no"` belongs to the DOM, not the locale string.

Page implementation/visual review owns inline placement versus tooltips, skeleton dimensions, title binding, empty/sparse/dense/error coverage, recovery paths, wrapping/widows, tabular numerals, long user content, icon labels, semantic elements, ARIA/accessibility tree, heading anchors/skip links, media captions, logo resources and language selection from user settings rather than IP/GPS. Flag relevant gaps without claiming the translator implements them.

Do not insert `&nbsp;`, `&#x2060;` or manual newlines into shared plain React/React Native strings to fix a guessed layout. If the component specifically requires non-breaking behavior, choose an actual supported character or layout treatment and test it separately. Character counts with dynamic placeholders are estimates; representative long values and actual font/viewport need user visual validation.

## Delivery

Use the existing `1k-i18n` preview and approved apply flow. Prioritize the four main languages for wording review, but fill all locales required by the draft. No automatic upload from this skill. After an authorized upload verify variable integrity and the returned/pulled text.
