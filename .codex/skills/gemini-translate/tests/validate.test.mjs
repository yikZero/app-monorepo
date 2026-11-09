import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  collectReviewRequired,
  validateInput,
  validateTranslations,
} from '../scripts/lib/validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sampleInput = JSON.parse(
  readFileSync(join(root, 'fixtures/sample-input.json'), 'utf8'),
);
const sampleTranslations = JSON.parse(
  readFileSync(join(root, 'fixtures/sample-translations.json'), 'utf8'),
).translations;

test('sample fixture input is valid', () => {
  assert.deepEqual(validateInput(sampleInput), []);
  assert.equal(sampleInput.items.length, 10);
});

test('sourceLanguage stays required when --project omits targetLanguages', () => {
  const items = sampleInput.items;
  const missingSource = validateInput(
    { items },
    { requireTargetLanguages: false },
  );
  assert.ok(missingSource.some((msg) => msg.includes('sourceLanguage')));
  assert.equal(
    missingSource.some((msg) => msg.includes('targetLanguages')),
    false,
  );

  assert.deepEqual(
    validateInput(
      { sourceLanguage: 'en_US', items },
      { requireTargetLanguages: false },
    ),
    [],
  );

  const explicitMode = validateInput({ sourceLanguage: 'en', items });
  assert.ok(explicitMode.some((msg) => msg.includes('targetLanguages')));
});

test('sample translations are complete with matching placeholders', () => {
  assert.deepEqual(
    validateTranslations({
      input: sampleInput,
      translations: sampleTranslations,
    }),
    [],
  );
});

test('flags missing, duplicate, and empty translations', () => {
  const missing = sampleTranslations.filter(
    (row) => !(row.id === 'confirm_action' && row.language === 'de'),
  );
  const missingErrors = validateTranslations({
    input: sampleInput,
    translations: missing,
  });
  assert.ok(
    missingErrors.some((msg) =>
      msg.includes('missing translation for id confirm_action language de'),
    ),
  );

  const duplicate = [
    ...sampleTranslations,
    { id: 'confirm_action', language: 'zh-CN', text: '确认一下' },
  ];
  const duplicateErrors = validateTranslations({
    input: sampleInput,
    translations: duplicate,
  });
  assert.ok(
    duplicateErrors.some((msg) =>
      msg.includes(
        'duplicate translation for id confirm_action language zh-CN',
      ),
    ),
  );

  const emptied = sampleTranslations.map((row) =>
    row.id === 'cancel_action' && row.language === 'ja'
      ? { ...row, text: '   ' }
      : row,
  );
  const emptyErrors = validateTranslations({
    input: sampleInput,
    translations: emptied,
  });
  assert.ok(
    emptyErrors.some((msg) =>
      msg.includes('empty translation for id cancel_action language ja'),
    ),
  );
});

test('flags simple placeholder multiplicity mismatches including repeats', () => {
  const broken = sampleTranslations.map((row) => {
    if (row.id === 'pair_quote' && row.language === 'zh-CN') {
      return { ...row, text: '{amount} {symbol} ≈ {amount}' };
    }
    if (row.id === 'send_amount' && row.language === 'de') {
      return { ...row, text: '{amount} {symbol} {symbol} senden' };
    }
    return row;
  });
  const errors = validateTranslations({
    input: sampleInput,
    translations: broken,
  });
  assert.ok(
    errors.some(
      (msg) => msg.includes('pair_quote') && msg.includes('{symbol}×2'),
    ),
  );
  assert.ok(
    errors.some(
      (msg) => msg.includes('send_amount') && msg.includes('{symbol}×2'),
    ),
  );
});

test('rejects unbalanced source braces and marks complex ICU for review', () => {
  const unbalanced = {
    sourceLanguage: 'en',
    targetLanguages: ['de'],
    items: [{ id: 'broken', text: 'Hello {name' }],
  };
  const inputErrors = validateInput(unbalanced);
  assert.ok(
    inputErrors.some((msg) => /unsupported placeholder syntax/.test(msg)),
  );

  const icuInput = {
    sourceLanguage: 'en',
    targetLanguages: ['de'],
    items: [
      {
        id: 'item_count',
        text: '{count, plural, one {# file} other {# files}}',
      },
    ],
  };
  assert.deepEqual(validateInput(icuInput), []);
  const review = collectReviewRequired(icuInput);
  assert.equal(review.length, 1);
  assert.equal(review[0].id, 'item_count');
  assert.match(review[0].reason, /does not fully parse ICU/);

  const icuErrors = validateTranslations({
    input: icuInput,
    translations: [
      {
        id: 'item_count',
        language: 'de',
        text: '{count, plural, one {# Datei} other {# Dateien}}',
      },
    ],
  });
  assert.deepEqual(icuErrors, []);
});
