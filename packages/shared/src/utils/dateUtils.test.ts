import { formatDistanceToNowStrict, formatRelativeTimeAbbr } from './dateUtils';

test('formatRelativeTimeAbbr', () => {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  expect(formatRelativeTimeAbbr(oneMinuteAgo)).toBe('1m');
});

test('formatRelativeTimeAbbr auto-detects timestamp format', () => {
  const now = Math.floor(Date.now() / 1000);
  const oneMinuteAgo = now - 60;

  expect(formatRelativeTimeAbbr(oneMinuteAgo)).toBe('1m');
});

test('formatDistanceToNowStrict forwards the unit option', () => {
  const tenSecondsAgo = Date.now() - 10 * 1000;

  expect(
    formatDistanceToNowStrict(tenSecondsAgo, {
      addSuffix: false,
      unit: 'minute',
      roundingMethod: 'ceil',
    }),
  ).toMatch(/1/);
  expect(
    formatDistanceToNowStrict(tenSecondsAgo, {
      addSuffix: false,
      roundingMethod: 'floor',
    }),
  ).toMatch(/10/);
});
