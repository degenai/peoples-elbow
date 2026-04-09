import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getTimeSince } from './utils.js';

describe('getTimeSince', () => {
  const fixedNow = new Date('2024-05-15T12:00:00Z');

  test('returns Never when dateStr is falsy', () => {
    const result = getTimeSince(null);
    assert.deepStrictEqual(result, { days: Infinity, weeks: Infinity, formatted: 'Never' });
  });

  test('returns Today when diffDays is 0', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-05-15T10:00:00Z').toISOString());
    assert.strictEqual(result.formatted, 'Today');
    assert.strictEqual(result.days, 0);
  });

  test('returns Yesterday when diffDays is 1', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-05-14T12:00:00Z').toISOString());
    assert.strictEqual(result.formatted, 'Yesterday');
    assert.strictEqual(result.days, 1);
  });

  test('returns X days ago when diffDays < 7', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-05-10T12:00:00Z').toISOString());
    assert.strictEqual(result.formatted, '5 days ago');
    assert.strictEqual(result.days, 5);
  });

  test('returns 1 week ago when diffWeeks is 1', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-05-08T12:00:00Z').toISOString());
    assert.strictEqual(result.formatted, '1 week ago');
    assert.strictEqual(result.weeks, 1);
  });

  test('returns X weeks ago when diffWeeks < 4', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-04-24T12:00:00Z').toISOString());
    assert.strictEqual(result.formatted, '3 weeks ago');
    assert.strictEqual(result.weeks, 3);
  });

  test('returns 4 weeks ago when diffDays is 28', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-04-17T12:00:00Z').toISOString());
    assert.strictEqual(result.formatted, '4 weeks ago');
  });

  test('returns 4 weeks ago when diffDays is 29', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-04-16T12:00:00Z').toISOString());
    assert.strictEqual(result.formatted, '4 weeks ago');
  });

  test('returns 1 month ago when diffMonths is 1', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-04-15T12:00:00Z').toISOString());
    assert.strictEqual(result.formatted, '1 month ago');
  });

  test('returns X months ago when diffMonths > 1', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
    const result = getTimeSince(new Date('2024-02-15T12:00:00Z').toISOString());
    assert.strictEqual(result.formatted, '3 months ago');
  });
});
