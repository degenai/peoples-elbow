import test from 'node:test';
import assert from 'node:assert';
import { recencyTier } from './render.js';

test('recencyTier handles empty or null lead gracefully', () => {
  assert.strictEqual(recencyTier(null), 'new');
  assert.strictEqual(recencyTier({}), 'new');
  assert.strictEqual(recencyTier({ lastVisit: null }), 'new');
});

test('recencyTier works with time relative correctly', (t) => {
  // Fix time to a specific point for predictable testing
  const fixedNow = new Date('2024-05-01T12:00:00.000Z').getTime();
  t.mock.timers.enable({ apis: ['Date'], now: fixedNow });

  // 1. Infinity (no visit) -> 'new' is covered in previous test

  // 2. 0-7 days -> 'green'
  const leadThisWeek = { lastVisit: '2024-04-30T10:00:00.000Z' }; // 1 day ago
  assert.strictEqual(recencyTier(leadThisWeek), 'green');

  const lead7Days = { lastVisit: '2024-04-24T10:00:00.000Z' }; // 7 days ago
  assert.strictEqual(recencyTier(lead7Days), 'green');

  // 3. 8-14 days -> 'yellow'
  const lead8Days = { lastVisit: '2024-04-23T10:00:00.000Z' }; // 8 days ago
  assert.strictEqual(recencyTier(lead8Days), 'yellow');

  const lead1to2Weeks = { lastVisit: '2024-04-20T10:00:00.000Z' }; // 11 days ago
  assert.strictEqual(recencyTier(lead1to2Weeks), 'yellow');

  const lead14Days = { lastVisit: '2024-04-17T10:00:00.000Z' }; // 14 days ago
  assert.strictEqual(recencyTier(lead14Days), 'yellow');

  // 4. 15-21 days -> 'orange'
  const lead15Days = { lastVisit: '2024-04-16T10:00:00.000Z' }; // 15 days ago
  assert.strictEqual(recencyTier(lead15Days), 'orange');

  const lead2to3Weeks = { lastVisit: '2024-04-12T10:00:00.000Z' }; // 19 days ago
  assert.strictEqual(recencyTier(lead2to3Weeks), 'orange');

  const lead21Days = { lastVisit: '2024-04-10T10:00:00.000Z' }; // 21 days ago
  assert.strictEqual(recencyTier(lead21Days), 'orange');

  // 5. 22-28 days -> 'red'
  const lead22Days = { lastVisit: '2024-04-09T10:00:00.000Z' }; // 22 days ago
  assert.strictEqual(recencyTier(lead22Days), 'red');

  const lead3to4Weeks = { lastVisit: '2024-04-05T10:00:00.000Z' }; // 26 days ago
  assert.strictEqual(recencyTier(lead3to4Weeks), 'red');

  const lead28Days = { lastVisit: '2024-04-03T10:00:00.000Z' }; // 28 days ago
  assert.strictEqual(recencyTier(lead28Days), 'red');

  // 6. 29-60 days -> 'purple'
  const lead29Days = { lastVisit: '2024-04-02T10:00:00.000Z' }; // 29 days ago
  assert.strictEqual(recencyTier(lead29Days), 'purple');

  const lead1to2Months = { lastVisit: '2024-03-20T10:00:00.000Z' }; // ~42 days ago
  assert.strictEqual(recencyTier(lead1to2Months), 'purple');

  const lead60Days = { lastVisit: '2024-03-02T10:00:00.000Z' }; // 60 days ago
  assert.strictEqual(recencyTier(lead60Days), 'purple');

  // 7. > 60 days -> 'black'
  const lead61Days = { lastVisit: '2024-03-01T10:00:00.000Z' }; // 61 days ago
  assert.strictEqual(recencyTier(lead61Days), 'black');

  const leadOver2Months = { lastVisit: '2024-01-01T10:00:00.000Z' }; // > 60 days
  assert.strictEqual(recencyTier(leadOver2Months), 'black');
});
