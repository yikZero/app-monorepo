# Translation prompt and task context

The fixed system instruction lives in `scripts/lib/schema.mjs` (`SYSTEM_INSTRUCTION`). Keep the general translation contract there; do not bake project-specific translations or page widths into it.

## Per-task input

Use existing `context`, per-item `context`, and `glossary` fields. No extra CLI flags are needed.

For UI work, supply what is known:
- Surface and UI role: button, field label, toast, warning, or help text.
- Business meaning and current state: what action occurred, remains pending, or is available next.
- Placeholder meanings (asset, address, amount, network, time), so modifiers attach correctly.
- Approved terminology for each locale, plus non-translatable brands/code.
- Locale-specific tone and length constraints from the actual design; do not invent a universal width.
- A few approved nearby translations as style examples when useful, in context. Keep them separate from source items and avoid treating examples as additional output rows.

Example per-item context: `Error toast after execution failed. The fee has already been charged, not merely estimated. Preserve that completed state. Target limits: zh-CN 32, ja 50, de 100. Placeholders are fee amounts.`

If faithful text does not fit, review the wording or layout rather than silently deleting a condition or action. The CLI does not enforce character budgets or prove rendered fit. Its ICU review flag still requires separate verification; stronger instructions do not replace a parser.

## Basis and verification

- [Gemini prompt design](https://ai.google.dev/gemini-api/docs/prompting-strategies): explicit instructions, task constraints, structured output, useful examples, and iterative evaluation.
- [Microsoft contextual metadata](https://learn.microsoft.com/en-us/globalization/internationalization/contextual-metadata): UI location/role, meaning and placeholder context help disambiguate short strings.
- [Google writing for translation](https://developers.google.com/style/translation): clear structures and consistent terminology support localization.

On 2026-09-14 the prompt was compared with the previous version using Gemini 3.8 Flash low: 40 regression items and 16 held-out items, four locales, two rounds per version (448 translations per version). Both fit the provided character budgets. The new prompt retained all required ICU structures; the old one simplified seven Chinese/Japanese plural structures. Those old structures were valid for the locale, but did not match the requested source-selector preservation. Ordinary wording quality was similar; this does not establish universal accuracy or speed improvements.
