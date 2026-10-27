import {
  DEFAULT_MODEL,
  LITE_MODEL,
  MODELS,
  PROJECTS,
  defaultThinkingFor,
} from './constants.mjs';
export function helpText() {
  return `gemini-translate — batch translation via Gemini

Usage:
  node scripts/cli.mjs --input <file.json> --output <file.json> [--model <id>] [--thinking <level>] [--project client|server]

Required:
  --input     JSON batch (sourceLanguage required; targetLanguages required unless --project)
  --output    Write result JSON here (not written on failure)

Optional:
  --model     ${DEFAULT_MODEL} (default), ${LITE_MODEL}, or gemini-3.1-flash-lite
  --thinking  Default is low for ${DEFAULT_MODEL}. Explicit ${LITE_MODEL}
              with no --thinking omits thinkingConfig (provider default).
              Explicit --thinking overrides. Allowed:
                ${DEFAULT_MODEL}:      low | medium | high
                ${LITE_MODEL}, gemini-3.1-flash-lite: minimal | low | medium | high
  --project   client | server. Resolve ALL current Lokalise languages
              (including base) each run. Preserve API lang_iso codes exactly.
              targetLanguages may be omitted; if present they must match the
              live set exactly. Without --project, no Lokalise credentials.

Credentials:
  GEMINI_API_KEY, or macOS Keychain service gemini-translate account gemini-api-key.
  With --project: LOKALISE_TOKEN, or macOS Keychain service
  ENV-BIG-FE-APP-MONOREPO-DEV account LOKALISE_TOKEN.
  Keys and raw API error bodies are never printed.

This CLI does not upload to Lokalise, edit generated locale files, or fall back
to another model. API failures are fatal.

See references/cli.md for JSON schemas and validation rules.`;
}
export function parseArgs(argv) {
  const result = {
    help: false,
    input: null,
    output: null,
    model: DEFAULT_MODEL,
    thinking: null,
    project: null,
  };
  let thinkingFlag = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--input' && next) {
      result.input = next;
      i += 1;
    } else if (arg === '--output' && next) {
      result.output = next;
      i += 1;
    } else if (arg === '--model' && next) {
      result.model = next;
      i += 1;
    } else if (arg === '--thinking' && next) {
      result.thinking = next.toLowerCase();
      thinkingFlag = true;
      i += 1;
    } else if (arg === '--project' && next) {
      result.project = next;
      i += 1;
    } else {
      throw usageError(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (result.help) return result;
  if (!result.input) throw usageError('Missing --input');
  if (!result.output) throw usageError('Missing --output');
  if (!thinkingFlag) {
    result.thinking = defaultThinkingFor(result.model);
  }
  validateModelAndThinking(result.model, result.thinking);
  if (
    result.project !== null &&
    result.project !== undefined &&
    !PROJECTS[result.project]
  ) {
    throw usageError(
      `Unsupported --project ${result.project}. Allowed: ${Object.keys(PROJECTS).join(', ')}.`,
    );
  }
  return result;
}
export function validateModelAndThinking(model, thinking) {
  const spec = MODELS[model];
  if (!spec) {
    throw usageError(
      `Unsupported model ${model}. Allowed: ${Object.keys(MODELS).join(', ')}. No automatic fallback.`,
    );
  }
  if (thinking === null || thinking === undefined) return;
  if (!spec.thinkingLevels.includes(thinking)) {
    throw usageError(
      `Unsupported --thinking ${thinking} for ${model}. Allowed: ${spec.thinkingLevels.join(', ')} (omit the flag to use the model default).`,
    );
  }
}
export function usageError(message) {
  const err = new Error(message);
  err.exitCode = 2;
  return err;
}
