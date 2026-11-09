import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeMessage,
  samePlaceholderCounts,
} from '../scripts/lib/placeholders.mjs';

test('counts repeated simple placeholders', () => {
  const analysis = analyzeMessage('{amount} {symbol} ≈ {amount} {symbol}');
  assert.equal(analysis.kind, 'simple');
  assert.deepEqual(analysis.placeholders, { amount: 2, symbol: 2 });
});

test('detects multiplicity mismatch', () => {
  const source = analyzeMessage('Send {amount} {symbol}');
  const broken = analyzeMessage('发送 {amount} {amount} {symbol}');
  assert.equal(
    samePlaceholderCounts(source.placeholders, broken.placeholders),
    false,
  );
});

test('marks complex ICU without claiming a full parse', () => {
  const analysis = analyzeMessage(
    '{count, plural, one {# item} other {# items}}',
  );
  assert.equal(analysis.kind, 'complex_icu');
  assert.match(analysis.reason, /does not fully parse ICU/i);
});

test('rejects unbalanced braces as unsupported syntax', () => {
  const unclosed = analyzeMessage('Hello {name');
  assert.equal(unclosed.kind, 'unsupported_syntax');
  assert.match(unclosed.reason, /unclosed/);

  const extra = analyzeMessage('Hello name}');
  assert.equal(extra.kind, 'unsupported_syntax');
  assert.match(extra.reason, /extra closing/);
});
