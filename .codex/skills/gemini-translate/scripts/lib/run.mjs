import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createGeminiGenerate } from './client.mjs';
import { readApiKey, readLokaliseToken } from './credentials.mjs';
import {
  languageSetConflict,
  resolveProjectLanguages,
  sameLanguageSet,
} from './lokalise.mjs';
import { redact, toPublicError } from './redact.mjs';
import { withRetries } from './retry.mjs';
import { parseModelResponse, pickUsageMetadata } from './schema.mjs';
import {
  collectReviewRequired,
  sortTranslations,
  validateInput,
  validateTranslations,
} from './validate.mjs';

export async function runTranslate({
  input,
  model,
  thinking = null,
  generateContent,
  getApiKey = readApiKey,
  sleep,
  now = Date.now,
} = {}) {
  const inputErrors = validateInput(input);
  if (inputErrors.length) {
    const err = new Error(`Invalid input:\n${inputErrors.join('\n')}`);
    err.exitCode = 1;
    throw err;
  }

  const apiKey = getApiKey();
  const generate =
    generateContent ||
    createGeminiGenerate({
      apiKey,
    });

  let retried;
  try {
    retried = await withRetries(() => generate({ input, model, thinking }), {
      sleep,
      now,
    });
  } catch (err) {
    throw publicFailure(err, apiKey, 'Gemini API request failed');
  }

  let parsed;
  try {
    parsed = parseModelResponse(retried.result);
  } catch (err) {
    throw publicFailure(err, apiKey, 'Gemini API response was unusable');
  }

  const validationErrors = validateTranslations({
    input,
    translations: parsed.translations,
  });
  if (validationErrors.length) {
    const err = new Error(
      `Translation validation failed:\n${validationErrors.join('\n')}`,
    );
    err.exitCode = 1;
    attachTiming(err, retried);
    throw toPublicError(err, [apiKey]);
  }

  const output = {
    sourceLanguage: input.sourceLanguage,
    targetLanguages: [...input.targetLanguages],
    model,
    elapsedMs: retried.elapsedMs,
    attempts: retried.attempts,
    retries: retried.retries,
    attemptElapsedMs: retried.attemptElapsedMs,
    usageMetadata: pickUsageMetadata(retried.result?.usageMetadata),
    translations: sortTranslations(input, parsed.translations).map((row) => ({
      id: row.id,
      language: row.language,
      text: row.text,
    })),
  };
  if (thinking) output.thinking = thinking;
  const reviewRequired = collectReviewRequired(input);
  if (reviewRequired.length) output.reviewRequired = reviewRequired;
  return output;
}

export async function runCli(args, io = {}) {
  const readFile = io.readFileSync || readFileSync;
  const writeFile = io.writeFileSync || writeFileSync;
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);

  let raw;
  try {
    raw = readFile(inputPath, 'utf8');
  } catch {
    const err = new Error(`Cannot read --input ${inputPath}`);
    err.exitCode = 1;
    throw err;
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    const err = new Error('--input is not valid JSON');
    err.exitCode = 1;
    throw err;
  }

  const inputErrors = validateInput(input, {
    requireTargetLanguages: !args.project,
  });
  if (inputErrors.length) {
    const err = new Error(`Invalid input:\n${inputErrors.join('\n')}`);
    err.exitCode = 1;
    throw err;
  }

  let project = null;
  if (args.project) {
    const getLokaliseToken = io.getLokaliseToken || readLokaliseToken;
    const lokaliseToken = getLokaliseToken();
    try {
      project = await resolveProjectLanguages({
        alias: args.project,
        token: lokaliseToken,
        fetchFn: io.fetchFn || fetch,
        ...(io.lokalisePageLimit ? { pageLimit: io.lokalisePageLimit } : {}),
      });
    } catch (err) {
      throw publicFailure(
        err,
        lokaliseToken,
        'Lokalise project languages request failed',
      );
    }

    if (Array.isArray(input.targetLanguages)) {
      if (!sameLanguageSet(input.targetLanguages, project.languages)) {
        const { missing, extra } = languageSetConflict(
          input.targetLanguages,
          project.languages,
        );
        const err = new Error(
          `input targetLanguages do not match live Lokalise languages for ${args.project} (provided ${input.targetLanguages.length}, live ${project.languages.length}; missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'})`,
        );
        err.exitCode = 1;
        throw err;
      }
    }
    input = { ...input, targetLanguages: project.languages };
  }

  const output = await runTranslate({
    input,
    model: args.model,
    thinking: args.thinking,
    generateContent: io.generateContent,
    getApiKey: io.getApiKey,
    sleep: io.sleep,
    now: io.now,
  });

  if (project) {
    output.project = {
      alias: project.alias,
      id: project.id,
      name: project.name,
      baseLanguage: project.baseLanguage,
    };
    output.targetLanguages = [...project.languages];
  }

  writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  return output;
}

function publicFailure(err, apiKey, prefix) {
  const redacted = redact(err?.message || String(err), [apiKey]);
  const out = new Error(`${prefix}: ${redacted}`);
  out.name = 'TranslateError';
  out.exitCode = 1;
  if (typeof err?.status === 'number') out.status = err.status;
  attachTiming(out, err);
  return out;
}

function attachTiming(target, source) {
  if (typeof source?.attempts === 'number') target.attempts = source.attempts;
  if (typeof source?.retries === 'number') target.retries = source.retries;
  if (typeof source?.elapsedMs === 'number')
    target.elapsedMs = source.elapsedMs;
  if (Array.isArray(source?.attemptElapsedMs)) {
    target.attemptElapsedMs = source.attemptElapsedMs;
  }
}
