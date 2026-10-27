const SIMPLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function analyzeMessage(text) {
  if (typeof text !== 'string') {
    return { kind: 'unsupported_syntax', reason: 'text is not a string' };
  }
  const braces = matchTopLevelBraces(text);
  if (braces.error) {
    return { kind: 'unsupported_syntax', reason: braces.error };
  }
  const names = [];
  let complex = false;
  for (const inner of braces.inners) {
    if (SIMPLE_NAME.test(inner)) {
      names.push(inner);
    } else {
      complex = true;
    }
  }
  if (complex) {
    return {
      kind: 'complex_icu',
      reason:
        'contains non-simple brace content; this CLI does not fully parse ICU MessageFormat',
    };
  }
  const placeholders = countNames(names);
  return { kind: 'simple', placeholders };
}

export function countSimplePlaceholders(text) {
  const analysis = analyzeMessage(text);
  if (analysis.kind !== 'simple') return null;
  return analysis.placeholders;
}

export function formatPlaceholderCounts(counts) {
  const keys = Object.keys(counts).toSorted();
  if (keys.length === 0) return '(none)';
  return keys.map((key) => `{${key}}×${counts[key]}`).join(', ');
}

export function samePlaceholderCounts(left, right) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if ((left[key] || 0) !== (right[key] || 0)) return false;
  }
  return true;
}

function countNames(names) {
  const counts = {};
  for (const name of names) {
    counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

function matchTopLevelBraces(text) {
  const inners = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      if (depth === 0) {
        return { error: 'unbalanced braces (extra closing brace)' };
      }
      depth -= 1;
      if (depth === 0) {
        inners.push(text.slice(start + 1, i));
      }
    }
  }
  if (depth !== 0) {
    return { error: 'unbalanced braces (unclosed brace)' };
  }
  return { inners };
}
