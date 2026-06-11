// Tests for the v2 data normalizer.
//
// Plain node:test + node:assert, zero dependencies, same style as utils.test.js.
// Run with:  node --test js/crm/data-normalizer.test.js
//
// The normalizer is the gatekeeper between "whatever is on disk" and "what the
// rest of the app trusts", so these tests lean on the migration paths and the
// repair/needsSave contract rather than happy-path getters.

import test from 'node:test';
import assert from 'node:assert';
import {
  normalizeLeadsData,
  normalizeLead,
  normalizeContacts,
  normalizeVisit
} from './data-normalizer.js';

// A safe slug id (matches /^[A-Za-z0-9_-]{1,64}$/) so the normalizer keeps it
// and we can assert against a known value.
const SAFE_ID = 'lead_abc-123';

// Build a fully-clean v2 lead. Passing this through normalizeLead should be a
// no-op (changed === false) — that's what proves we fixed the always-dirty bug.
function cleanLead(overrides = {}) {
  return {
    id: SAFE_ID,
    name: 'Tabletop Kingdom',
    address: '123 Main St',
    neighborhood: 'Downtown',
    status: 'active',
    venueType: 'card-shop',
    source: 'field',
    notes: 'good vibes',
    scores: { space: 4, traffic: 3, vibes: 5 },
    totalScore: 12,
    contacts: [
      { id: 'c_1', name: 'Sam', role: 'owner', phone: '555', email: 'a@b.co', isPrimary: true }
    ],
    visits: [
      { id: 'v_1', date: '2026-01-10T00:00:00.000Z', notes: 'dropped in', reception: 'warm' }
    ],
    coords: { lat: 34.1, lon: -84.5 },
    lastVisit: '2026-01-10T00:00:00.000Z',
    created: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z',
    ...overrides
  };
}

// --- the regression test: already-normalized v2 data must NOT be dirty ---

test('normalizing an already-normalized v2 envelope returns needsSave === false', () => {
  const envelope = {
    schemaVersion: 2,
    leads: [cleanLead()],
    activityLog: [{ timestamp: '2026-01-01T00:00:00.000Z', message: 'created lead' }]
  };
  const { needsSave } = normalizeLeadsData(envelope);
  assert.strictEqual(needsSave, false, 'clean v2 data should not be flagged for save');
});

test('normalizeLead on a clean lead reports changed === false', () => {
  const { changed } = normalizeLead(cleanLead());
  assert.strictEqual(changed, false);
});

// --- v1 -> v2 migration ---

test('v1 input (no schemaVersion) is stamped to v2 and flagged needsSave', () => {
  const v1 = {
    leads: [cleanLead()],
    activityLog: []
  };
  const { data, needsSave } = normalizeLeadsData(v1);
  assert.strictEqual(data.schemaVersion, 2);
  assert.strictEqual(needsSave, true);
});

test('v1 lead gets v2 fields filled with defaults', () => {
  // A v1 lead has none of the v2 fields.
  const v1Lead = {
    id: SAFE_ID,
    name: 'Old Lead',
    status: 'active',
    scores: { space: 3, traffic: 3, vibes: 3 },
    created: '2026-01-01T00:00:00.000Z'
  };
  const { lead, changed } = normalizeLead(v1Lead);
  assert.strictEqual(lead.source, 'field', 'source defaults to field');
  assert.strictEqual(lead.venueType, '', 'venueType defaults to empty');
  assert.strictEqual(lead.notes, '', 'notes defaults to empty string');
  assert.strictEqual(lead.coords, null, 'missing coords becomes null');
  assert.strictEqual(lead.updatedAt, lead.created, 'updatedAt defaults to created');
  assert.strictEqual(changed, true);
});

// --- Electron-era flat-contact migration ---

test('Electron flat contact fields migrate into contacts[]', () => {
  const electronLead = {
    id: SAFE_ID,
    name: 'Legacy Shop',
    status: 'active',
    created: '2026-01-01T00:00:00.000Z',
    contactName: 'Pat',
    contactRole: 'manager',
    phone: '555-1234',
    email: 'pat@shop.com'
  };
  const { lead, changed } = normalizeLead(electronLead);

  assert.strictEqual(lead.contacts.length, 1);
  assert.strictEqual(lead.contacts[0].name, 'Pat');
  assert.strictEqual(lead.contacts[0].role, 'manager');
  assert.strictEqual(lead.contacts[0].phone, '555-1234');
  assert.strictEqual(lead.contacts[0].email, 'pat@shop.com');
  assert.strictEqual(lead.contacts[0].isPrimary, true);

  // Legacy flat fields must be removed.
  assert.strictEqual('contactName' in lead, false);
  assert.strictEqual('contactRole' in lead, false);
  assert.strictEqual('phone' in lead, false);
  assert.strictEqual('email' in lead, false);

  assert.strictEqual(changed, true);
});

test('normalizeContacts standalone: flat fields fold in and one primary is set', () => {
  const rawLead = { phone: '555', email: 'x@y.z' };
  const { contacts, changed, removedLegacyFields } = normalizeContacts(rawLead);
  assert.strictEqual(contacts.length, 1);
  assert.strictEqual(contacts[0].phone, '555');
  assert.strictEqual(contacts[0].isPrimary, true);
  assert.strictEqual(removedLegacyFields, true);
  assert.strictEqual(changed, true);
});

test('normalizeContacts collapses multiple primaries to a single primary', () => {
  const rawLead = {
    contacts: [
      { id: 'c_1', name: 'A', isPrimary: true },
      { id: 'c_2', name: 'B', isPrimary: true }
    ]
  };
  const { contacts, changed } = normalizeContacts(rawLead);
  assert.strictEqual(contacts[0].isPrimary, true);
  assert.strictEqual(contacts[1].isPrimary, false);
  assert.strictEqual(changed, true);
});

// --- lastVisit = MAX of visit dates (not last array element) ---

test('lastVisit is the MAX visit date even when visits are out of order', () => {
  const lead = cleanLead({
    visits: [
      { id: 'v_1', date: '2026-03-01T00:00:00.000Z', notes: '', reception: 'warm' },
      { id: 'v_2', date: '2026-01-01T00:00:00.000Z', notes: '', reception: 'cold' },
      { id: 'v_3', date: '2026-02-01T00:00:00.000Z', notes: '', reception: 'lukewarm' }
    ],
    lastVisit: '2026-02-01T00:00:00.000Z' // deliberately wrong: this is the middle date
  });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.strictEqual(normalized.lastVisit, '2026-03-01T00:00:00.000Z');
  assert.strictEqual(changed, true, 'fixing a wrong lastVisit counts as a change');
});

test('lastVisit is null when there are no visits', () => {
  const lead = cleanLead({ visits: [], lastVisit: null });
  const { lead: normalized } = normalizeLead(lead);
  assert.strictEqual(normalized.lastVisit, null);
});

// --- malicious / malformed id regeneration ---

test('malicious id (attribute-breakout) is discarded and regenerated', () => {
  const evilId = '"><img src=x onerror=alert(1)>';
  const lead = cleanLead({ id: evilId });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.notStrictEqual(normalized.id, evilId, 'evil id must not survive');
  assert.match(normalized.id, /^[A-Za-z0-9_-]{1,64}$/, 'regenerated id must be a safe slug');
  assert.strictEqual(changed, true);
});

test('missing id is generated', () => {
  const lead = cleanLead({ id: undefined });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.match(normalized.id, /^[A-Za-z0-9_-]{1,64}$/);
  assert.strictEqual(changed, true);
});

test('an over-long id (>64 chars) is rejected and regenerated', () => {
  const lead = cleanLead({ id: 'a'.repeat(65) });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.notStrictEqual(normalized.id, 'a'.repeat(65));
  assert.match(normalized.id, /^[A-Za-z0-9_-]{1,64}$/);
  assert.strictEqual(changed, true);
});

test('a contact id that is malicious is regenerated too', () => {
  const lead = cleanLead({
    contacts: [{ id: '<script>', name: 'Sam', isPrimary: true }]
  });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.match(normalized.contacts[0].id, /^[A-Za-z0-9_-]{1,64}$/);
  assert.strictEqual(changed, true);
});

// --- score clamping (ints 1-5) ---

test('scores are coerced to integers clamped 1-5', () => {
  const lead = cleanLead({
    scores: { space: 0, traffic: 99, vibes: 3.7 },
    totalScore: 0 // wrong on purpose
  });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.strictEqual(normalized.scores.space, 1, 'below-range clamps up to 1');
  assert.strictEqual(normalized.scores.traffic, 5, 'above-range clamps down to 5');
  assert.strictEqual(normalized.scores.vibes, 4, '3.7 rounds to 4');
  assert.strictEqual(normalized.totalScore, 10, 'totalScore recomputed from clamped scores');
  assert.strictEqual(changed, true);
});

test('non-finite / missing scores default to 3', () => {
  const lead = cleanLead({ scores: {}, totalScore: undefined });
  const { lead: normalized } = normalizeLead(lead);
  assert.deepStrictEqual(normalized.scores, { space: 3, traffic: 3, vibes: 3 });
  assert.strictEqual(normalized.totalScore, 9);
});

// --- coords validation ---

test('coords with finite lat/lon are kept', () => {
  const lead = cleanLead({ coords: { lat: 34.05, lon: -84.51 } });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.deepStrictEqual(normalized.coords, { lat: 34.05, lon: -84.51 });
  assert.strictEqual(changed, false, 'valid coords are not a change');
});

test('coords preserve the approximate boolean', () => {
  const lead = cleanLead({ coords: { lat: 34, lon: -84, approximate: true } });
  const { lead: normalized } = normalizeLead(lead);
  assert.deepStrictEqual(normalized.coords, { lat: 34, lon: -84, approximate: true });
});

test('coords with non-finite values are nulled', () => {
  const lead = cleanLead({ coords: { lat: 'nope', lon: -84 } });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.strictEqual(normalized.coords, null);
  assert.strictEqual(changed, true);
});

test('coords missing lon is nulled', () => {
  const lead = cleanLead({ coords: { lat: 34 } });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.strictEqual(normalized.coords, null);
  assert.strictEqual(changed, true);
});

// --- enum defaults ---

test('invalid status / source fall back to defaults; venueType is free text', () => {
  const lead = cleanLead({
    status: 'bogus',
    source: 'spy-satellite',
    venueType: 'Comic Shop'
  });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.strictEqual(normalized.status, 'active');
  assert.strictEqual(normalized.source, 'field');
  // venueType is a free-text combobox now (like the area field) — kept, not enum-gated.
  assert.strictEqual(normalized.venueType, 'Comic Shop');
  assert.strictEqual(changed, true);
});

test('venueType is whitespace-collapsed, trimmed, and length-capped', () => {
  const { lead: a } = normalizeLead(cleanLead({ venueType: '  Comic   Shop  ' }));
  assert.strictEqual(a.venueType, 'Comic Shop');
  const { lead: b } = normalizeLead(cleanLead({ venueType: 'x'.repeat(200) }));
  assert.strictEqual(b.venueType.length, 60);
});

test('empty-string venueType is valid and preserved', () => {
  const lead = cleanLead({ venueType: '' });
  const { lead: normalized, changed } = normalizeLead(lead);
  assert.strictEqual(normalized.venueType, '');
  assert.strictEqual(changed, false);
});

// --- visit normalization ---

test('normalizeVisit assigns an id and validates reception', () => {
  const { visit, changed } = normalizeVisit({ date: '2026-01-01T00:00:00.000Z', reception: 'hostile' });
  assert.match(visit.id, /^[A-Za-z0-9_-]{1,64}$/);
  assert.strictEqual(visit.reception, 'lukewarm', 'invalid reception falls back to default');
  assert.strictEqual(visit.notes, '');
  assert.strictEqual(changed, true);
});

test('normalizeVisit on a clean visit is not changed', () => {
  const clean = { id: 'v_1', date: '2026-01-01T00:00:00.000Z', notes: 'hi', reception: 'warm' };
  const { changed } = normalizeVisit(clean);
  assert.strictEqual(changed, false);
});

test('normalizeVisit handles a non-object input', () => {
  const { visit, changed } = normalizeVisit(null);
  assert.match(visit.id, /^[A-Za-z0-9_-]{1,64}$/);
  assert.strictEqual(visit.reception, 'lukewarm');
  assert.strictEqual(changed, true);
});

// --- envelope-level repairs ---

test('non-object input yields an empty v2 envelope that needs saving', () => {
  const { data, needsSave } = normalizeLeadsData(null);
  assert.strictEqual(data.schemaVersion, 2);
  assert.deepStrictEqual(data.leads, []);
  assert.deepStrictEqual(data.activityLog, []);
  assert.strictEqual(needsSave, true);
});

test('activityLog entries missing a message are dropped and flagged', () => {
  const envelope = {
    schemaVersion: 2,
    leads: [],
    activityLog: [
      { timestamp: '2026-01-01T00:00:00.000Z', message: 'ok' },
      { timestamp: '2026-01-02T00:00:00.000Z' } // no message -> dropped
    ]
  };
  const { data, needsSave } = normalizeLeadsData(envelope);
  assert.strictEqual(data.activityLog.length, 1);
  assert.strictEqual(needsSave, true);
});
