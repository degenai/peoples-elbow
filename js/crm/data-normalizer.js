// Data normalizer for Lead-o-Tron v2.
//
// This module takes whatever blob of CRM data we loaded from disk / localStorage
// (which could be ancient Electron-era data, a v1 web export, or already-clean v2)
// and forces it into the canonical v2 shape, repairing missing/garbage fields.
//
// It returns { data, needsSave }. The `needsSave` flag is the important part:
// if we had to repair anything we tell the caller to persist the cleaned data so
// the repair only happens once. If the data was already clean, needsSave is false
// and we DON'T churn the file (the v1 code had an always-dirty bug — see below).

import {
  STATUS_VALUES,
  RECEPTION_VALUES,
  VENUE_TYPE_VALUES,
  SOURCE_VALUES,
  DEFAULTS
} from './constants.js';
import { generateId as uuidv4 } from './utils.js';

// The schema version this normalizer produces. Bump in lockstep with the schema
// contract so old data gets re-stamped on load.
const SCHEMA_VERSION = 2;

// v2 defaults from the schema contract. We keep these as local literals rather
// than reaching into DEFAULTS for keys that may not exist yet — the schema
// contract is the source of truth, and this keeps the normalizer self-contained.
const DEFAULT_SOURCE = 'field';
const DEFAULT_VENUE_TYPE = '';
const DEFAULT_SCORE = 3; // middle of the 1-5 range

// Ids end up in HTML attribute positions (data-id="...") all over the UI. An id
// pulled from old/imported data could carry a crafted string that breaks out of
// the attribute and injects markup (stored XSS). We only trust ids that look like
// boring slugs; anything else gets thrown away and regenerated. 64 chars is plenty
// for a UUID and well short of anything weaponizable.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function isSafeId(value) {
  return typeof value === 'string' && SAFE_ID.test(value);
}

// Clamp a score into an integer 1..5. The v1 code accepted any finite number
// (e.g. 3.7, or 99), which then poisoned totalScore and the sorting UI. We coerce
// hard here so the rest of the app can trust scores are 1-5 ints.
function clampScore(value) {
  // Coerce numeric strings first — imported/migrated data (v1 exports, hand-edited
  // JSON) often stores scores as "5". Without this, Number.isFinite('5') is false
  // and a real 5 gets silently replaced with the default 3.
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return DEFAULT_SCORE;
  const rounded = Math.round(n);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded;
}

function normalizeLeadsData(rawData) {
  let needsSave = false;
  const data = rawData && typeof rawData === 'object' ? { ...rawData } : {};

  // Stamp the schema version. If it was missing (v1 / Electron) or wrong, that's
  // a real change worth saving.
  if (data.schemaVersion !== SCHEMA_VERSION) {
    data.schemaVersion = SCHEMA_VERSION;
    needsSave = true;
  }

  if (!Array.isArray(data.leads)) {
    data.leads = [];
    needsSave = true;
  }

  if (!Array.isArray(data.activityLog)) {
    data.activityLog = [];
    needsSave = true;
  }

  data.leads = data.leads.map((lead) => {
    const { lead: normalizedLead, changed } = normalizeLead(lead);
    if (changed) needsSave = true;
    return normalizedLead;
  });

  const normalizedLog = data.activityLog
    .filter(entry => entry && typeof entry.message === 'string')
    .map(entry => ({
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString(),
      message: entry.message
    }));

  if (normalizedLog.length !== data.activityLog.length) {
    needsSave = true;
  }
  data.activityLog = normalizedLog;

  return { data, needsSave };
}

function normalizeLead(lead) {
  let changed = false;

  // Work on a shallow copy so we never mutate the caller's object. Note: copying
  // is NOT itself a "change" — the v1 code did `if (rawLead !== lead) changed = true`,
  // and since a fresh {...lead} is always a new reference that was ALWAYS true,
  // which is exactly the always-dirty bug. We only flip `changed` on real value
  // differences from here on.
  const isObject = lead && typeof lead === 'object';
  const rawLead = isObject ? { ...lead } : { name: String(lead ?? '') };
  if (!isObject) changed = true; // a non-object lead genuinely had to be rebuilt

  // --- id hygiene ---
  // Keep the id only if it's a safe slug; otherwise regenerate. This covers both
  // the missing-id case and the malicious-id case in one check.
  if (!isSafeId(rawLead.id)) {
    rawLead.id = uuidv4();
    changed = true;
  }

  // --- string fields ---
  const name = typeof rawLead.name === 'string' ? rawLead.name : String(rawLead.name || '');
  const address = typeof rawLead.address === 'string' ? rawLead.address : '';
  const neighborhood = typeof rawLead.neighborhood === 'string' ? rawLead.neighborhood : '';
  const notes = typeof rawLead.notes === 'string' ? rawLead.notes : '';
  if (
    rawLead.name !== name ||
    rawLead.address !== address ||
    rawLead.neighborhood !== neighborhood ||
    rawLead.notes !== notes
  ) {
    changed = true;
  }
  rawLead.name = name;
  rawLead.address = address;
  rawLead.neighborhood = neighborhood;
  rawLead.notes = notes;

  // --- status enum ---
  if (typeof rawLead.status !== 'string' || !STATUS_VALUES.includes(rawLead.status)) {
    rawLead.status = DEFAULTS.STATUS;
    changed = true;
  }

  // --- source enum (v2) ---
  if (typeof rawLead.source !== 'string' || !SOURCE_VALUES.includes(rawLead.source)) {
    rawLead.source = DEFAULT_SOURCE;
    changed = true;
  }

  // --- venueType enum (v2) ---
  // Empty string is a valid value here (means "not categorized yet"), so we accept
  // '' OR a member of VENUE_TYPE_VALUES; anything else falls back to ''.
  if (rawLead.venueType !== '' && !VENUE_TYPE_VALUES.includes(rawLead.venueType)) {
    rawLead.venueType = DEFAULT_VENUE_TYPE;
    changed = true;
  }

  // --- created timestamp ---
  if (!rawLead.created || typeof rawLead.created !== 'string') {
    rawLead.created = new Date().toISOString();
    changed = true;
  }

  // --- updatedAt timestamp (v2) ---
  // Default to `created` so freshly-migrated leads have a sensible value rather
  // than "now" (which would make every old lead look just-touched).
  if (!rawLead.updatedAt || typeof rawLead.updatedAt !== 'string') {
    rawLead.updatedAt = rawLead.created;
    changed = true;
  }

  // --- contacts (incl. Electron-era flat-field migration) ---
  const { contacts, changed: contactsChanged, removedLegacyFields } = normalizeContacts(rawLead);
  if (contactsChanged || removedLegacyFields) {
    changed = true;
  }
  rawLead.contacts = contacts;

  // --- visits ---
  const visits = Array.isArray(rawLead.visits) ? rawLead.visits : [];
  if (!Array.isArray(rawLead.visits)) changed = true;
  const normalizedVisits = visits.map((visit) => {
    const { visit: normalizedVisit, changed: visitChanged } = normalizeVisit(visit);
    if (visitChanged) changed = true;
    return normalizedVisit;
  });
  rawLead.visits = normalizedVisits;

  // --- scores (coerced to ints 1-5) ---
  const scores = rawLead.scores && typeof rawLead.scores === 'object' ? { ...rawLead.scores } : {};
  const space = clampScore(scores.space);
  const traffic = clampScore(scores.traffic);
  const vibes = clampScore(scores.vibes);
  if (scores.space !== space || scores.traffic !== traffic || scores.vibes !== vibes) {
    changed = true;
  }
  rawLead.scores = { space, traffic, vibes };

  const computedTotal = space + traffic + vibes;
  if (!Number.isFinite(rawLead.totalScore) || rawLead.totalScore !== computedTotal) {
    rawLead.totalScore = computedTotal;
    changed = true;
  }

  // --- coords (v2) ---
  // Keep coords only if lat AND lon are finite numbers; otherwise null it.
  // Preserve the optional `approximate` boolean when present.
  const coords = normalizeCoords(rawLead.coords);
  if (!coordsEqual(rawLead.coords, coords)) {
    changed = true;
  }
  rawLead.coords = coords;

  // --- lastVisit = MAX of visit dates ---
  // The v1 code took the LAST array element, but visits can be stored out of
  // order, so we compute the maximum parseable date instead. null when no visits.
  const computedLastVisit = computeLastVisit(rawLead.visits);
  if (rawLead.lastVisit !== computedLastVisit) {
    rawLead.lastVisit = computedLastVisit;
    changed = true;
  }

  return { lead: rawLead, changed };
}

// Pick the latest (max) visit date as an ISO string, or null if there are no
// visits with a parseable date.
function computeLastVisit(visits) {
  let maxTime = -Infinity;
  let maxIso = null;
  for (const visit of visits) {
    const time = Date.parse(visit.date);
    if (Number.isFinite(time) && time > maxTime) {
      maxTime = time;
      maxIso = visit.date;
    }
  }
  return maxIso;
}

// Validate a coords object. Returns a clean { lat, lon[, approximate] } or null.
function normalizeCoords(coords) {
  if (!coords || typeof coords !== 'object') return null;
  const { lat, lon } = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const clean = { lat, lon };
  // Only carry `approximate` if it was explicitly a boolean; don't invent it.
  if (typeof coords.approximate === 'boolean') {
    clean.approximate = coords.approximate;
  }
  return clean;
}

// Compare an incoming coords value against our normalized one, so we don't flag a
// change when nothing actually moved. Handles the null cases and the optional
// `approximate` key.
function coordsEqual(before, after) {
  if (after === null) {
    // Unchanged only if `before` was already null/undefined.
    return before === null || before === undefined;
  }
  if (!before || typeof before !== 'object') return false;
  if (before.lat !== after.lat || before.lon !== after.lon) return false;
  // approximate is undefined on `after` when it wasn't a boolean on `before`.
  return before.approximate === after.approximate
    || (after.approximate === undefined && !('approximate' in before));
}

function normalizeContacts(rawLead) {
  let changed = false;
  let removedLegacyFields = false;
  let contacts = Array.isArray(rawLead.contacts) ? rawLead.contacts : null;

  // Electron-era migration: old data stored a single contact as flat fields on
  // the lead (contactName / contactRole / phone / email). Fold those into the
  // contacts[] array and mark the legacy keys for deletion.
  if (!contacts && (rawLead.contactName || rawLead.contactRole || rawLead.phone || rawLead.email)) {
    contacts = [
      {
        id: uuidv4(),
        name: rawLead.contactName || '',
        role: rawLead.contactRole || '',
        phone: rawLead.phone || '',
        email: rawLead.email || '',
        isPrimary: true
      }
    ];
    removedLegacyFields = true;
    changed = true;
  }

  if (!contacts) {
    contacts = [];
    changed = true;
  }

  let primaryIndex = -1;
  contacts = contacts.map((contact, index) => {
    const normalized = contact && typeof contact === 'object' ? { ...contact } : {};
    // Same id-hygiene rule as leads: regenerate anything that isn't a safe slug.
    if (!isSafeId(normalized.id)) {
      normalized.id = uuidv4();
      changed = true;
    }
    normalized.name = typeof normalized.name === 'string' ? normalized.name : '';
    normalized.role = typeof normalized.role === 'string' ? normalized.role : '';
    normalized.phone = typeof normalized.phone === 'string' ? normalized.phone : '';
    normalized.email = typeof normalized.email === 'string' ? normalized.email : '';

    const isPrimary = Boolean(normalized.isPrimary);
    if (isPrimary && primaryIndex === -1) {
      primaryIndex = index;
    } else if (isPrimary) {
      normalized.isPrimary = false;
      changed = true;
    } else {
      normalized.isPrimary = false;
    }

    return normalized;
  });

  // Every contact list with members needs exactly one primary; default to the
  // first if none claimed it.
  if (contacts.length > 0 && primaryIndex === -1) {
    contacts[0].isPrimary = true;
    changed = true;
  }

  if (removedLegacyFields) {
    delete rawLead.contactName;
    delete rawLead.contactRole;
    delete rawLead.phone;
    delete rawLead.email;
  }

  return { contacts, changed, removedLegacyFields };
}

function normalizeVisit(visit) {
  if (!visit || typeof visit !== 'object') {
    return {
      visit: {
        id: uuidv4(),
        date: new Date().toISOString(),
        notes: '',
        reception: DEFAULTS.RECEPTION
      },
      changed: true
    };
  }
  let changed = false;

  // Visits get ids in v2 (same hygiene rule as leads/contacts).
  let id = visit.id;
  if (!isSafeId(id)) {
    id = uuidv4();
    changed = true;
  }

  const date = typeof visit.date === 'string' ? visit.date : new Date().toISOString();
  const notes = typeof visit.notes === 'string' ? visit.notes : '';
  const reception = RECEPTION_VALUES.includes(visit.reception) ? visit.reception : DEFAULTS.RECEPTION;
  if (date !== visit.date || notes !== visit.notes || reception !== visit.reception) {
    changed = true;
  }

  return {
    visit: { id, date, notes, reception },
    changed
  };
}

export {
  normalizeLeadsData,
  normalizeLead,
  normalizeContacts,
  normalizeVisit
};
