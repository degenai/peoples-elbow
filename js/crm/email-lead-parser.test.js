// Tests for the email -> partial-lead parser.
// Run: node --test js/crm/email-lead-parser.test.js
//
// We import the worker's REAL formatHostEmail so the fence round-trip exercises
// the exact body the website produces -- if the worker's template ever drifts,
// these tests catch it.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseLeadEmail } from './email-lead-parser.js';
import { formatHostEmail } from '../../workers/host-form-worker.js';

test('fence round-trip: parses a body the worker actually produces', () => {
  const body = formatHostEmail({
    venueName: 'Dragon Star Cards',
    contactName: 'Casey Lee',
    contactEmail: 'casey@dragonstar.example',
    venueType: 'card-shop',
    message: 'We have a back room every Saturday.',
    sourceDate: '2026-06-11T15:00:00.000Z'
  });

  const result = parseLeadEmail(body);
  assert.ok(result, 'should return a result object');
  assert.deepEqual(result.warnings, []);

  const { lead } = result;
  assert.equal(lead.name, 'Dragon Star Cards');
  assert.equal(lead.venueType, 'card-shop');
  assert.equal(lead.source, 'website');
  assert.equal(lead.notes, 'We have a back room every Saturday.');
  assert.equal(lead.sourceDate, '2026-06-11T15:00:00.000Z');

  assert.equal(lead.contacts.length, 1);
  assert.equal(lead.contacts[0].name, 'Casey Lee');
  assert.equal(lead.contacts[0].email, 'casey@dragonstar.example');
  assert.equal(lead.contacts[0].isPrimary, true);
});

test('quoted-reply fence: tolerates "> " line prefixes from email clients', () => {
  const body = formatHostEmail({
    venueName: 'Sprout Farmers Market',
    contactName: 'Robin Diaz',
    contactEmail: 'robin@sprout.example',
    venueType: 'farmers-market',
    message: 'Sundays work best.',
    sourceDate: '2026-06-10T12:00:00.000Z'
  });

  // Simulate a forwarded/replied email: every line prefixed with "> ",
  // some lines with nested "> > " quoting.
  const quoted = body
    .split('\n')
    .map((line, i) => (i % 2 === 0 ? `> ${line}` : `> > ${line}`))
    .join('\n');

  const result = parseLeadEmail(quoted);
  assert.ok(result, 'should still parse through the quote prefixes');
  assert.deepEqual(result.warnings, []);
  assert.equal(result.lead.name, 'Sprout Farmers Market');
  assert.equal(result.lead.venueType, 'farmers-market');
  assert.equal(result.lead.contacts[0].email, 'robin@sprout.example');
  assert.equal(result.lead.notes, 'Sundays work best.');
});

test('legacy template fallback: old email with no fence', () => {
  // What the worker used to send before the LEAD JSON fence existed.
  const legacy = `
    New Host Connection Request

    Venue Name: Old Town Coffee
    Contact Name: Jordan Pike
    Contact Email: jordan@oldtown.example
    Venue Type: Community Space

    Message:
    Found you at the block party, want a table.
  `;

  const result = parseLeadEmail(legacy);
  assert.ok(result, 'legacy email should still parse');
  assert.equal(result.lead.name, 'Old Town Coffee');
  // "Community Space" (display label) must map back to the enum slug.
  assert.equal(result.lead.venueType, 'community-space');
  assert.equal(result.lead.source, 'website');
  assert.equal(result.lead.contacts[0].name, 'Jordan Pike');
  assert.equal(result.lead.contacts[0].email, 'jordan@oldtown.example');
  assert.equal(result.lead.notes, 'Found you at the block party, want a table.');
  assert.deepEqual(result.warnings, []);
});

test('legacy template: unknown venue type defaults to "other" with a warning', () => {
  const legacy = `
    New Host Connection Request

    Venue Name: The Mystery Spot
    Contact Name: Sam Ray
    Contact Email: sam@mystery.example
    Venue Type: Haunted Barn

    Message:
    Spooky but spacious.
  `;

  const result = parseLeadEmail(legacy);
  assert.ok(result);
  assert.equal(result.lead.venueType, 'other');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Haunted Barn/);
  assert.match(result.warnings[0], /other/);
});

test('malicious input survives stringify-escaping and parses to literal strings', () => {
  // A user types quotes, a JSON-breaking brace, HTML, and a newline into the
  // venue name and message. The worker JSON.stringify-escapes them; the parser
  // must hand back the LITERAL strings, not execute or mangle anything.
  const nasty = 'Bob\'s "Cards" }{ <script>alert(1)</script>\n--- END LEAD JSON ---';
  const nastyMsg = 'Line one\nLine "two" with \\ backslash and } brace';

  const body = formatHostEmail({
    venueName: nasty,
    contactName: 'Eve <evil>',
    contactEmail: 'eve@example.com',
    venueType: 'other',
    message: nastyMsg,
    sourceDate: '2026-06-11T00:00:00.000Z'
  });

  const result = parseLeadEmail(body);
  assert.ok(result, 'should parse despite hostile content');
  // The literal string comes back intact -- including the fake "END" marker the
  // attacker embedded, because it lived inside a JSON string, not as real text.
  assert.equal(result.lead.name, nasty);
  assert.equal(result.lead.notes, nastyMsg);
  assert.equal(result.lead.contacts[0].name, 'Eve <evil>');
  assert.deepEqual(result.warnings, []);
});

test('garbage input returns null', () => {
  assert.equal(parseLeadEmail('just some random newsletter, nothing structured here'), null);
  assert.equal(parseLeadEmail(''), null);
  assert.equal(parseLeadEmail('   '), null);
  assert.equal(parseLeadEmail(null), null);
  assert.equal(parseLeadEmail(undefined), null);
  assert.equal(parseLeadEmail(42), null);
});
