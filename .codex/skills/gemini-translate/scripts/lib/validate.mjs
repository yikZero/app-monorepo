import {
  analyzeMessage,
  formatPlaceholderCounts,
  samePlaceholderCounts,
} from './placeholders.mjs';
export function pairKey(id, language) {
  return JSON.stringify([id, language]);
}
export function validateInput(input, { requireTargetLanguages = true } = {}) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['input must be a JSON object'];
  }
  if (!nonEmptyString(input.sourceLanguage)) {
    errors.push('sourceLanguage must be a non-empty string');
  }
  const omittedTargets =
    (input.targetLanguages === null || input.targetLanguages === undefined) &&
    !requireTargetLanguages;
  if (
    !omittedTargets &&
    (!Array.isArray(input.targetLanguages) ||
      input.targetLanguages.length === 0)
  ) {
    errors.push('targetLanguages must be a non-empty array');
  } else if (!omittedTargets) {
    const seenLang = new Set();
    Array.from(input.targetLanguages.entries()).forEach(([index, language]) => {
      if (!nonEmptyString(language)) {
        errors.push(`targetLanguages[${index}] must be a non-empty string`);
        return;
      }
      if (seenLang.has(language)) {
        errors.push(`duplicate target language ${language}`);
      }
      seenLang.add(language);
    });
  }
  if (
    input.context !== null &&
    input.context !== undefined &&
    typeof input.context !== 'string'
  ) {
    errors.push('context must be a string when provided');
  }
  if (
    input.glossary !== null &&
    input.glossary !== undefined &&
    typeof input.glossary !== 'object'
  ) {
    errors.push('glossary must be an object or array when provided');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    errors.push('items must be a non-empty array');
    return errors;
  }
  const seenIds = new Set();
  Array.from(input.items.entries()).forEach(([index, item]) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`items[${index}] must be an object`);
      return;
    }
    if (!nonEmptyString(item.id)) {
      errors.push(`items[${index}].id must be a non-empty string`);
    } else if (seenIds.has(item.id)) {
      errors.push(`duplicate item id ${item.id}`);
    } else {
      seenIds.add(item.id);
    }
    if (typeof item.text !== 'string' || item.text.trim() === '') {
      errors.push(`items[${index}].text must be a non-empty string`);
    } else {
      const analysis = analyzeMessage(item.text);
      if (analysis.kind === 'unsupported_syntax') {
        errors.push(
          `items[${index}] id ${item.id ?? '<missing>'} has unsupported placeholder syntax: ${analysis.reason}`,
        );
      }
    }
    if (
      item.context !== null &&
      item.context !== undefined &&
      typeof item.context !== 'string'
    ) {
      errors.push(`items[${index}].context must be a string when provided`);
    }
  });
  return errors;
}
export function annotateItems(items) {
  return items.map((item) => {
    const analysis = analyzeMessage(item.text);
    return {
      ...item,
      analysis,
    };
  });
}
export function validateTranslations({ input, translations }) {
  const errors = [];
  if (!Array.isArray(translations)) {
    return ['model response translations must be an array'];
  }
  const items = annotateItems(input.items);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const languages = new Set(input.targetLanguages);
  const expected = new Set();
  for (const item of items) {
    for (const language of input.targetLanguages) {
      expected.add(pairKey(item.id, language));
    }
  }
  const seen = new Set();
  Array.from(translations.entries()).forEach(([index, row]) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(`translations[${index}] must be an object`);
      return;
    }
    if (!nonEmptyString(row.id)) {
      errors.push(`translations[${index}].id must be a non-empty string`);
      return;
    }
    if (!nonEmptyString(row.language)) {
      errors.push(`translations[${index}].language must be a non-empty string`);
      return;
    }
    const key = pairKey(row.id, row.language);
    if (seen.has(key)) {
      errors.push(
        `duplicate translation for id ${row.id} language ${row.language}`,
      );
    }
    seen.add(key);
    if (!itemById.has(row.id)) {
      errors.push(`unknown translation id ${row.id}`);
    }
    if (!languages.has(row.language)) {
      errors.push(
        `unexpected language code ${row.language} for id ${row.id}; codes must match targetLanguages exactly`,
      );
    }
    if (typeof row.text !== 'string' || row.text.trim() === '') {
      errors.push(
        `empty translation for id ${row.id} language ${row.language}`,
      );
      return;
    }
    const item = itemById.get(row.id);
    if (!item) return;
    const sourceKind = item.analysis.kind;
    const translationAnalysis = analyzeMessage(row.text);
    if (translationAnalysis.kind === 'unsupported_syntax') {
      errors.push(
        `unsupported placeholder syntax in translation id ${row.id} language ${row.language}: ${translationAnalysis.reason}`,
      );
      return;
    }
    if (sourceKind === 'simple') {
      if (translationAnalysis.kind !== 'simple') {
        errors.push(
          `id ${row.id} language ${row.language} introduced complex brace syntax not present in the source`,
        );
        return;
      }
      if (
        !samePlaceholderCounts(
          item.analysis.placeholders,
          translationAnalysis.placeholders,
        )
      ) {
        errors.push(
          `placeholder multiplicity mismatch for id ${row.id} language ${row.language}: source ${formatPlaceholderCounts(item.analysis.placeholders)} vs translation ${formatPlaceholderCounts(translationAnalysis.placeholders)}`,
        );
      }
    }
  });
  for (const key of expected) {
    if (!seen.has(key)) {
      const [id, language] = JSON.parse(key);
      errors.push(`missing translation for id ${id} language ${language}`);
    }
  }
  return errors;
}
export function collectReviewRequired(input) {
  const reviewRequired = [];
  for (const item of annotateItems(input.items)) {
    if (item.analysis.kind === 'complex_icu') {
      reviewRequired.push({
        id: item.id,
        reason: item.analysis.reason,
      });
    }
  }
  return reviewRequired;
}
export function sortTranslations(input, translations) {
  const itemOrder = new Map(input.items.map((item, index) => [item.id, index]));
  const languageOrder = new Map(
    input.targetLanguages.map((language, index) => [language, index]),
  );
  return [...translations].toSorted((a, b) => {
    const idDelta = (itemOrder.get(a.id) ?? 0) - (itemOrder.get(b.id) ?? 0);
    if (idDelta !== 0) return idDelta;
    return (
      (languageOrder.get(a.language) ?? 0) -
      (languageOrder.get(b.language) ?? 0)
    );
  });
}
function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}
