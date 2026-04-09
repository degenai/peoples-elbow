import test from 'node:test';
import assert from 'node:assert/strict';
import { getTimeSince } from './utils.js';

test('getTimeSince', async (t) => {
  // Use a fixed date for testing
  const fixedNow = new Date('2024-05-15T12:00:00Z');
  t.mock.timers.enable({ apis: ['Date'], now: fixedNow });

  await t.test('handles missing or falsy input', () => {
    assert.deepEqual(getTimeSince(null), { days: Infinity, weeks: Infinity, formatted: 'Never' });
    assert.deepEqual(getTimeSince(''), { days: Infinity, weeks: Infinity, formatted: 'Never' });
    assert.deepEqual(getTimeSince(undefined), { days: Infinity, weeks: Infinity, formatted: 'Never' });
  });

  await t.test('handles today (same day, same time)', () => {
    const then = fixedNow.toISOString();
    assert.deepEqual(getTimeSince(then), { days: 0, weeks: 0, formatted: 'Today' });
  });

  await t.test('handles today (few hours ago)', () => {
    const then = new Date(fixedNow.getTime() - 12 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(then), { days: 0, weeks: 0, formatted: 'Today' });
  });

  await t.test('handles yesterday (24 hours ago)', () => {
    const then = new Date(fixedNow.getTime() - 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(then), { days: 1, weeks: 0, formatted: 'Yesterday' });
  });

  await t.test('handles yesterday (47 hours ago)', () => {
    const then = new Date(fixedNow.getTime() - 47 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(then), { days: 1, weeks: 0, formatted: 'Yesterday' });
  });

  await t.test('handles days ago (2-6 days)', () => {
    const twoDays = new Date(fixedNow.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(twoDays), { days: 2, weeks: 0, formatted: '2 days ago' });

    const sixDays = new Date(fixedNow.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(sixDays), { days: 6, weeks: 0, formatted: '6 days ago' });
  });

  await t.test('handles 1 week ago (7-13 days)', () => {
    const sevenDays = new Date(fixedNow.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(sevenDays), { days: 7, weeks: 1, formatted: '1 week ago' });

    const thirteenDays = new Date(fixedNow.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(thirteenDays), { days: 13, weeks: 1, formatted: '1 week ago' });
  });

  await t.test('handles weeks ago (14-27 days)', () => {
    const fourteenDays = new Date(fixedNow.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(fourteenDays), { days: 14, weeks: 2, formatted: '2 weeks ago' });

    const twentySevenDays = new Date(fixedNow.getTime() - 27 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(twentySevenDays), { days: 27, weeks: 3, formatted: '3 weeks ago' });
  });

  await t.test('handles boundary: 28-29 days ago (returns 4 weeks ago, not 0 months)', () => {
    const twentyEightDays = new Date(fixedNow.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(twentyEightDays), { days: 28, weeks: 4, formatted: '4 weeks ago' });

    const twentyNineDays = new Date(fixedNow.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(twentyNineDays), { days: 29, weeks: 4, formatted: '4 weeks ago' });
  });

  await t.test('handles 1 month ago (30-59 days)', () => {
    const thirtyDays = new Date(fixedNow.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(thirtyDays), { days: 30, weeks: 4, formatted: '1 month ago' });

    const fiftyNineDays = new Date(fixedNow.getTime() - 59 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(fiftyNineDays), { days: 59, weeks: 8, formatted: '1 month ago' });
  });

  await t.test('handles months ago (60+ days)', () => {
    const sixtyDays = new Date(fixedNow.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(sixtyDays), { days: 60, weeks: 8, formatted: '2 months ago' });

    const oneHundredDays = new Date(fixedNow.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString();
    assert.deepEqual(getTimeSince(oneHundredDays), { days: 100, weeks: 14, formatted: '3 months ago' });
  });
});
