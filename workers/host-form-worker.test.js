// Tests for host-form-worker's PURE logic.
// Run: node --test workers/host-form-worker.test.js
//
// The Worker's fetch()/sendEmail() need Cloudflare bindings (the MAIL binding,
// the cloudflare:email module) that don't exist in plain Node, so we don't try
// to exercise them here. Instead we test the one piece of pure logic that
// actually matters for correctness: formatHostEmail(), which builds the email
// body -- including the machine-readable "--- LEAD JSON v1 ---" fence the CRM
// later parses. (The worker loads cloudflare:email lazily, so importing this
// module in Node is safe as long as we never call sendEmail.)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatHostEmail } from './host-form-worker.js';

// Pull the JSON object back out of the fence. We brace-balance (respecting
// string literals + escapes) rather than slicing to the "--- END LEAD JSON ---"
// marker, because a hostile value can legitimately contain that marker text
// inside an escaped JSON string. This mirrors the real parser's extraction.
function extractFenceJson(body) {
  const open = body.indexOf('--- LEAD JSON v1 ---');
  assert.notEqual(open, -1, 'body should contain the opening fence marker');

  const start = body.indexOf('{', open);
  assert.notEqual(start, -1, 'body should contain a JSON object after the marker');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(body.slice(start, i + 1));
    }
  }
  throw new Error('unbalanced JSON object in fence');
}

test('formatHostEmail: human section contains the submitted fields', () => {
  const body = formatHostEmail({
    venueName: 'Comic Cave',
    contactName: 'Pat Quinn',
    contactEmail: 'pat@comiccave.example',
    venueType: 'card-shop',
    message: 'Tuesdays are slow, come liven them up.',
    sourceDate: '2026-06-11T18:00:00.000Z'
  });

  assert.match(body, /Venue Name: Comic Cave/);
  assert.match(body, /Contact Name: Pat Quinn/);
  assert.match(body, /Contact Email: pat@comiccave\.example/);
  assert.match(body, /Venue Type: card-shop/);
  assert.match(body, /Tuesdays are slow/);
});

test('formatHostEmail: LEAD JSON fence is present and well-formed', () => {
  const body = formatHostEmail({
    venueName: 'Comic Cave',
    contactName: 'Pat Quinn',
    contactEmail: 'pat@comiccave.example',
    venueType: 'card-shop',
    message: 'Tuesdays are slow.',
    sourceDate: '2026-06-11T18:00:00.000Z'
  });

  assert.match(body, /--- LEAD JSON v1 ---/);
  assert.match(body, /--- END LEAD JSON ---/);

  const payload = extractFenceJson(body);
  assert.equal(payload.schema, 'lead-v1');
  assert.equal(payload.name, 'Comic Cave');
  assert.equal(payload.venueType, 'card-shop');
  assert.equal(payload.message, 'Tuesdays are slow.');
  assert.equal(payload.source, 'website');
  assert.equal(payload.sourceDate, '2026-06-11T18:00:00.000Z');

  assert.equal(payload.contacts.length, 1);
  assert.equal(payload.contacts[0].name, 'Pat Quinn');
  assert.equal(payload.contacts[0].email, 'pat@comiccave.example');
  assert.equal(payload.contacts[0].isPrimary, true);
});

test('formatHostEmail: special characters survive JSON.stringify escaping', () => {
  // Quotes, braces, HTML, backslashes, newlines, and even a fake fence marker
  // inside user input must come through as literal string values once the JSON
  // is parsed back -- proof the fields are stringify-escaped, not concatenated.
  const venueName = 'Joe\'s "Cards" }{ <b>shop</b>';
  const message = 'Line one\nLine "two" \\ end --- END LEAD JSON ---';

  const body = formatHostEmail({
    venueName,
    contactName: 'O\'Brien',
    contactEmail: 'obrien@example.com',
    venueType: 'other',
    message,
    sourceDate: '2026-06-11T00:00:00.000Z'
  });

  const payload = extractFenceJson(body);
  assert.equal(payload.name, venueName);
  assert.equal(payload.message, message);
  assert.equal(payload.contacts[0].name, "O'Brien");
});

test('formatHostEmail: sourceDate defaults to an ISO timestamp when omitted', () => {
  const body = formatHostEmail({
    venueName: 'No Date Venue',
    contactName: 'A',
    contactEmail: 'a@example.com',
    venueType: 'other',
    message: 'hi'
  });

  const payload = extractFenceJson(body);
  // Should be a parseable ISO date string, not undefined.
  assert.equal(typeof payload.sourceDate, 'string');
  assert.ok(!Number.isNaN(Date.parse(payload.sourceDate)), 'sourceDate should be a valid date');
});
