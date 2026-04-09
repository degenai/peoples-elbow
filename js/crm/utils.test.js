import test from 'node:test';
import assert from 'node:assert';
import { getTimeSince } from './utils.js';

test('getTimeSince handles empty input', () => {
  const result = getTimeSince('');
  assert.deepStrictEqual(result, { days: Infinity, weeks: Infinity, formatted: 'Never' });
});

test('getTimeSince handles null input', () => {
  const result = getTimeSince(null);
  assert.deepStrictEqual(result, { days: Infinity, weeks: Infinity, formatted: 'Never' });
});

test('getTimeSince handles undefined input', () => {
  const result = getTimeSince(undefined);
  assert.deepStrictEqual(result, { days: Infinity, weeks: Infinity, formatted: 'Never' });
});

test('getTimeSince calculates relative times correctly', (t) => {
  // Use a fixed "now" date: 2024-05-01T12:00:00.000Z
  const fixedNow = new Date('2024-05-01T12:00:00.000Z').getTime();
  t.mock.timers.enable({ apis: ['Date'], now: fixedNow });

  // Today (0 days diff)
  const todayDate = new Date('2024-05-01T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(todayDate.toISOString()), {
    days: 0,
    weeks: 0,
    formatted: 'Today'
  });

  // Yesterday (1 day diff)
  const yesterdayDate = new Date('2024-04-30T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(yesterdayDate.toISOString()), {
    days: 1,
    weeks: 0,
    formatted: 'Yesterday'
  });

  // Few days ago (3 days diff)
  const daysAgoDate = new Date('2024-04-28T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(daysAgoDate.toISOString()), {
    days: 3,
    weeks: 0,
    formatted: '3 days ago'
  });

  // 1 week ago (7 days diff)
  const oneWeekDate = new Date('2024-04-24T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(oneWeekDate.toISOString()), {
    days: 7,
    weeks: 1,
    formatted: '1 week ago'
  });

  // Multiple weeks ago (14 days diff)
  const twoWeeksDate = new Date('2024-04-17T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(twoWeeksDate.toISOString()), {
    days: 14,
    weeks: 2,
    formatted: '2 weeks ago'
  });

  // Boundary case: 28 days diff
  const twentyEightDaysDate = new Date('2024-04-03T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(twentyEightDaysDate.toISOString()), {
    days: 28,
    weeks: 4,
    formatted: '4 weeks ago' // Should be 4 weeks ago, not 0 months ago
  });

  // Boundary case: 29 days diff
  const twentyNineDaysDate = new Date('2024-04-02T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(twentyNineDaysDate.toISOString()), {
    days: 29,
    weeks: 4,
    formatted: '4 weeks ago' // Should be 4 weeks ago, not 0 months ago
  });

  // 1 month ago (30 days diff)
  const oneMonthDate = new Date('2024-04-01T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(oneMonthDate.toISOString()), {
    days: 30,
    weeks: 4,
    formatted: '1 month ago'
  });

  // Multiple months ago (65 days diff)
  const twoMonthsDate = new Date('2024-02-26T10:00:00.000Z');
  assert.deepStrictEqual(getTimeSince(twoMonthsDate.toISOString()), {
    days: 65,
    weeks: 9,
    formatted: '2 months ago'
  });
});
