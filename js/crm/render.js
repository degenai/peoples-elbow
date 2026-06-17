// ============================================
// Lead-o-Tron v2 — render.js
//
// This module is the ONLY thing that builds DOM from lead data, and it builds it
// the boring-and-safe way: clone the <template>s declared in crm.html, then fill
// them with textContent / setAttribute / .value. It NEVER assigns untrusted data
// through innerHTML. That single rule is what lets the "point an AI at this repo"
// privacy promise hold — there is no string-concatenated HTML path for a venue
// name or a contact note to break out of and inject script.
//
// render.js is a pure VIEW. It reads the live DOM and writes to it; it does not
// own state, never calls the store, and never wires events (app.js does all
// delegation). Leads arrive already filtered + sorted + derived (totalScore,
// lastVisit, updatedAt are computed by the store — we only display them).
// ============================================

import { getTimeSince } from './utils.js';

// ── small DOM helpers ───────────────────────────────────────────
// Grab a <template>'s first element child as a fresh clone, ready to fill.
function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  // .content.firstElementChild is the single root node we author in each template.
  return tpl.content.firstElementChild.cloneNode(true);
}

// textContent is the safe sink: the browser treats whatever we pass as literal
// text, never markup. `?? ''` so a null/undefined never prints the string
// "null"/"undefined" to the user.
function setText(el, value) {
  if (el) el.textContent = value ?? '';
}

// Look up a [data-field="x"] node inside a cloned card/row.
function field(root, name) {
  return root.querySelector(`[data-field="${name}"]`);
}

// ── vocabulary salvaged from the v1 renderer ────────────────────
// Recency color tiers: how long since the last visit, as a class on the dot.
// green=this week → black=2+ months, with a distinct "new/never" state. The CSS
// owns the actual colors via .crm-recency-dot--<tier>; we only pick the tier.
function recencyTierFromDays(days) {
  if (days === Infinity) return 'new';   // never visited — its own state, not "old"
  if (days <= 7) return 'green';         // visited this week
  if (days <= 14) return 'yellow';       // 1–2 weeks
  if (days <= 21) return 'orange';       // 2–3 weeks
  if (days <= 28) return 'red';          // 3–4 weeks
  if (days <= 60) return 'purple';       // 1–2 months
  return 'black';                        // 2+ months — cold
}

// Exported helper so app/route can reuse the exact same tiering off a lead.
export function recencyTier(lead) {
  const { days } = getTimeSince(lead && lead.lastVisit);
  return recencyTierFromDays(days);
}

// Reception emoji vocabulary (the chips' weather metaphor): warm / lukewarm /
// cold. '—' when a lead has no visits yet, so the slot never renders blank.
function receptionEmoji(reception) {
  switch (reception) {
    case 'warm': return '🔥';
    case 'lukewarm': return '🌤️';
    case 'cold': return '❄️';
    default: return '—';
  }
}

// The reception of the most-recent visit (by date). Visits can be stored out of
// order, so we don't trust array position — we pick the max-dated one, matching
// how the store computes lastVisit.
function lastReception(lead) {
  const visits = Array.isArray(lead.visits) ? lead.visits : [];
  if (!visits.length) return null;
  let best = null;
  let bestTime = -Infinity;
  for (const v of visits) {
    const t = Date.parse(v.date);
    if (Number.isFinite(t) && t >= bestTime) { bestTime = t; best = v; }
  }
  return best ? best.reception : visits[visits.length - 1].reception;
}

// Score color bucket: high ≥12, medium ≥8, else low. Drives .crm-lead-score--<x>.
function scoreClass(total) {
  if (total >= 12) return 'high';
  if (total >= 8) return 'medium';
  return 'low';
}

// Human label for a status, for the badge text. (The value is the safe enum; we
// just Title-case it for display.)
function statusLabel(status) {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Visits sorted newest-first for display, without mutating the source array.
function visitsNewestFirst(lead) {
  const visits = Array.isArray(lead.visits) ? lead.visits.slice() : [];
  visits.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  return visits;
}

// Pretty absolute date for visit headers / detail meta.
function formatDate(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// Human label for the venue-type enum (display only).
const VENUE_TYPE_LABELS = {
  'card-shop': 'Card shop',
  'farmers-market': 'Farmers market',
  'community-space': 'Community space',
  'other': 'Other',
};

// ── renderList ──────────────────────────────────────────────────
// Rebuild #lead-list from the (already filtered + sorted) leads. Each card is a
// clone of #lead-card-template filled with textContent; the lead id rides on the
// <li> via dataset.id so app.js can use event delegation to open the detail.
export function renderList(leads) {
  const list = document.getElementById('lead-list');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('lead-count');

  // Wipe and rebuild. textContent = '' is a safe, fast clear (no innerHTML).
  list.textContent = '';

  for (const lead of leads) {
    const li = cloneTemplate('lead-card-template');
    li.dataset.id = lead.id;

    setText(field(li, 'name'), lead.name);
    setText(field(li, 'neighborhood'), lead.neighborhood || 'No area');

    // Status badge: text + a styling hook class (active/converted/archived).
    const badge = field(li, 'status');
    setText(badge, statusLabel(lead.status));
    if (badge) {
      badge.classList.add(`crm-status-badge--${lead.status}`);
    }

    // Reception emoji of the latest visit (decorative — aria-hidden in template).
    setText(field(li, 'reception'), receptionEmoji(lastReception(lead)));

    // Last-visit relative text ("3 days ago" / "Never visited").
    const since = getTimeSince(lead.lastVisit);
    setText(field(li, 'lastvisit'), lead.lastVisit ? since.formatted : 'Never visited');

    // Recency dot tier — the at-a-glance "how overdue is this" signal.
    const dot = li.querySelector('[data-recency]');
    if (dot) dot.classList.add(`crm-recency-dot--${recencyTierFromDays(since.days)}`);

    // Total score + color bucket.
    const scoreEl = field(li, 'score');
    setText(scoreEl, lead.totalScore);
    if (scoreEl) scoreEl.classList.add(`crm-lead-score--${scoreClass(lead.totalScore)}`);

    list.appendChild(li);
  }

  // Empty-state toggle + count text.
  if (emptyState) emptyState.classList.toggle('hidden', leads.length > 0);
  setText(countEl, `${leads.length} lead${leads.length === 1 ? '' : 's'}`);
}

// ── renderDetail ────────────────────────────────────────────────
// Fill the read-only lead sheet. Built entirely with createElement + textContent.
// Phone/email render as real tel:/mailto: links (the href is the only attribute
// we set from data, and href on an <a> is a safe sink for tel:/mailto: values —
// we still never put data in an HTML-parsing position).
export function renderDetail(lead) {
  setText(document.getElementById('lead-sheet-title'), lead.name);
  const body = document.getElementById('lead-sheet-body');
  body.textContent = ''; // safe clear

  // tiny builders local to this function — keep the DOM plumbing readable.
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const section = (heading) => {
    const s = el('div', 'crm-detail-section');
    s.appendChild(el('h3', 'crm-detail-heading', heading));
    return s;
  };
  // A labeled "Label: value" row. value may be empty → renders a muted dash.
  const fieldRow = (label, value) => {
    const row = el('div', 'crm-detail-field');
    row.appendChild(el('span', 'crm-detail-label', label));
    row.appendChild(el('span', value ? 'crm-detail-value' : 'crm-detail-value crm-detail-value--empty', value || '—'));
    return row;
  };

  // ── Status + recency ──
  const statusSec = section('Status');
  const statusRow = el('div', 'crm-detail-statusrow');
  const sBadge = el('span', `crm-status-badge crm-status-badge--${lead.status}`, statusLabel(lead.status));
  statusRow.appendChild(sBadge);
  const dot = el('span', `crm-recency-dot crm-recency-dot--${recencyTier(lead)}`);
  dot.setAttribute('aria-hidden', 'true');
  statusRow.appendChild(dot);
  statusRow.appendChild(el('span', 'crm-detail-recency', getTimeSince(lead.lastVisit).formatted));
  statusSec.appendChild(statusRow);
  body.appendChild(statusSec);

  // ── Place ──
  const placeSec = section('Place');
  placeSec.appendChild(fieldRow('Area', lead.neighborhood));
  placeSec.appendChild(fieldRow('Address', lead.address));
  // Known types get a friendly label; a custom typed-in type shows as-is.
  placeSec.appendChild(fieldRow('Type', VENUE_TYPE_LABELS[lead.venueType] || lead.venueType || ''));
  body.appendChild(placeSec);

  // ── Score breakdown ──
  const scoreSec = section('Score');
  const scoreGrid = el('div', 'crm-detail-scores');
  const scorePill = (label, value) => {
    const p = el('div', 'crm-detail-score');
    p.appendChild(el('span', 'crm-detail-score-label', label));
    p.appendChild(el('span', 'crm-detail-score-value', value));
    return p;
  };
  const scores = lead.scores || { space: 0, traffic: 0, vibes: 0 };
  scoreGrid.appendChild(scorePill('🪑 Space', scores.space));
  scoreGrid.appendChild(scorePill('👥 Traffic', scores.traffic));
  scoreGrid.appendChild(scorePill('✨ Vibes', scores.vibes));
  scoreSec.appendChild(scoreGrid);
  scoreSec.appendChild(el('div', `crm-detail-total crm-detail-total--${scoreClass(lead.totalScore)}`, `${lead.totalScore} / 15`));
  body.appendChild(scoreSec);

  // ── Contacts ──
  const contacts = Array.isArray(lead.contacts) ? lead.contacts : [];
  if (contacts.length) {
    const contactSec = section('Contacts');
    for (const c of contacts) {
      const card = el('div', 'crm-detail-contact');
      const nameLine = el('div', 'crm-detail-contact-name', c.name || 'No name');
      if (c.isPrimary) nameLine.appendChild(el('span', 'crm-detail-contact-primary', ' ★ Primary'));
      card.appendChild(nameLine);
      if (c.role) card.appendChild(el('div', 'crm-detail-contact-role', c.role));
      // Phone → tel: link. The phone value goes into href (safe sink) and into the
      // visible text (textContent, safe sink) — never into parsed HTML.
      if (c.phone) {
        const line = el('div', 'crm-detail-contact-line');
        const a = el('a', 'crm-detail-link', c.phone);
        a.setAttribute('href', `tel:${c.phone}`);
        line.appendChild(el('span', 'crm-detail-label', 'Phone'));
        line.appendChild(a);
        card.appendChild(line);
      }
      if (c.email) {
        const line = el('div', 'crm-detail-contact-line');
        const a = el('a', 'crm-detail-link', c.email);
        a.setAttribute('href', `mailto:${c.email}`);
        line.appendChild(el('span', 'crm-detail-label', 'Email'));
        line.appendChild(a);
        card.appendChild(line);
      }
      contactSec.appendChild(card);
    }
    body.appendChild(contactSec);
  }

  // ── Notes ──
  if (lead.notes) {
    const notesSec = section('Notes');
    notesSec.appendChild(el('p', 'crm-detail-notes', lead.notes));
    body.appendChild(notesSec);
  }

  // ── Visit history (newest-first), each with Edit/Delete carrying data-visit-id ──
  const visits = visitsNewestFirst(lead);
  const visitSec = section(`Visit history (${visits.length})`);
  if (!visits.length) {
    visitSec.appendChild(el('p', 'crm-detail-empty', 'No visits logged yet.'));
  } else {
    for (const v of visits) {
      const item = el('div', 'crm-visit-item');
      item.dataset.visitId = v.id;

      const head = el('div', 'crm-visit-head');
      head.appendChild(el('span', 'crm-visit-date', formatDate(v.date)));
      head.appendChild(el('span', 'crm-visit-reception', `${receptionEmoji(v.reception)} ${v.reception}`));

      const actions = el('div', 'crm-visit-actions');
      const editBtn = el('button', 'btn btn-secondary btn-sm', 'Edit');
      editBtn.type = 'button';
      editBtn.setAttribute('data-action', 'edit-visit');
      editBtn.dataset.visitId = v.id;
      const delBtn = el('button', 'btn btn-secondary btn-sm', 'Delete');
      delBtn.type = 'button';
      delBtn.setAttribute('data-action', 'delete-visit');
      delBtn.dataset.visitId = v.id;
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      head.appendChild(actions);
      item.appendChild(head);

      if (v.notes) item.appendChild(el('p', 'crm-visit-notes', v.notes));
      visitSec.appendChild(item);
    }
  }
  // "+ Log visit" — app.js opens the visit sheet off data-action="add-visit".
  const addVisitBtn = el('button', 'btn btn-secondary btn-sm', '+ Log visit');
  addVisitBtn.type = 'button';
  addVisitBtn.setAttribute('data-action', 'add-visit');
  visitSec.appendChild(addVisitBtn);
  body.appendChild(visitSec);

  // ── Lead-level actions ──
  const actions = el('div', 'crm-sheet-actions crm-detail-actions');
  const editLead = el('button', 'btn btn-primary', 'Edit venue');
  editLead.type = 'button';
  editLead.setAttribute('data-action', 'edit-lead');
  const delLead = el('button', 'btn btn-danger', 'Delete venue');
  delLead.type = 'button';
  delLead.setAttribute('data-action', 'delete-lead');
  actions.appendChild(editLead);
  actions.appendChild(delLead);
  body.appendChild(actions);
}

// ── fillForm ────────────────────────────────────────────────────
// Populate #lead-form for an edit, or reset it for a new lead (lead === null).
// Sets the title, hidden id, score radios, selects, contacts rows, and the
// quick-visit default. Always leaves at least one (blank) contact row.
export function fillForm(lead) {
  const form = document.getElementById('lead-form');
  const titleEl = document.getElementById('form-title');
  const idEl = document.getElementById('form-lead-id');

  // Start clean every time so a previous lead's data never leaks into a new one.
  form.reset();

  // Clear contacts list before we (re)build rows.
  const contactsList = document.getElementById('contacts-list');
  contactsList.textContent = '';

  if (lead) {
    setText(titleEl, 'Edit venue');
    idEl.value = lead.id;

    document.getElementById('field-name').value = lead.name || '';
    document.getElementById('field-neighborhood').value = lead.neighborhood || '';
    document.getElementById('field-address').value = lead.address || '';
    document.getElementById('field-venuetype').value = lead.venueType || '';
    document.getElementById('field-status').value = lead.status || 'active';
    document.getElementById('field-notes').value = lead.notes || '';

    // Score radios: check the matching value (1-5) for each axis.
    setScoreRadio('score-space', lead.scores && lead.scores.space);
    setScoreRadio('score-traffic', lead.scores && lead.scores.traffic);
    setScoreRadio('score-vibes', lead.scores && lead.scores.vibes);

    // Contacts: one row per existing contact (at least one if none).
    const contacts = Array.isArray(lead.contacts) ? lead.contacts : [];
    if (contacts.length) {
      contacts.forEach(addContactRow);
    } else {
      addContactRow();
    }

    // Editing an existing lead: don't default the quick-visit toggle on (the user
    // is editing details, not necessarily logging a fresh visit). Leave it off.
    const qvToggle = document.getElementById('quickvisit-toggle');
    qvToggle.checked = false;
    document.getElementById('quickvisit-fields').hidden = true;
  } else {
    setText(titleEl, 'New venue');
    idEl.value = '';

    // form.reset() restored the HTML defaults (scores=3 checked, status=active,
    // lukewarm reception). We just need a starting contact row and the quick-visit
    // toggle ON — the field default: you're usually logging the visit you just made.
    addContactRow();

    const qvToggle = document.getElementById('quickvisit-toggle');
    qvToggle.checked = true;
    document.getElementById('quickvisit-fields').hidden = false;
  }
}

// Check the score radio (name=score-<axis>) matching `value`. Falls back to 3.
function setScoreRadio(name, value) {
  const v = String(Number.isFinite(value) ? value : 3);
  const input = document.querySelector(`input[name="${name}"][value="${v}"]`);
  if (input) input.checked = true;
}

// ── addContactRow ───────────────────────────────────────────────
// Clone #contact-row-template into #contacts-list, optionally pre-filled. We set
// each field by .value (safe), never by building HTML.
export function addContactRow(contact) {
  const list = document.getElementById('contacts-list');
  const row = cloneTemplate('contact-row-template');

  if (contact) {
    const set = (name, val) => {
      const input = row.querySelector(`[data-field="${name}"]`);
      if (input) input.value = val ?? '';
    };
    set('id', contact.id);
    set('name', contact.name);
    set('role', contact.role);
    set('phone', contact.phone);
    set('email', contact.email);
    const primary = row.querySelector('[data-field="isPrimary"]');
    if (primary) primary.checked = !!contact.isPrimary;
  }

  list.appendChild(row);
}

// ── readForm ────────────────────────────────────────────────────
// Read #lead-form into a plain object in the v2 input shape. Scores come from the
// checked radios as ints; contacts skip fully-empty rows; quickVisit captures the
// toggle + chosen reception + notes. We do NOT compute derived fields here.
export function readForm() {
  const val = (id) => (document.getElementById(id)?.value ?? '').trim();
  const radioVal = (name) => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
  };

  const scores = {
    space: parseInt(radioVal('score-space'), 10) || 3,
    traffic: parseInt(radioVal('score-traffic'), 10) || 3,
    vibes: parseInt(radioVal('score-vibes'), 10) || 3,
  };

  // Contacts: read every row, skip the ones with nothing in them.
  const contacts = [];
  const rows = document.querySelectorAll('#contacts-list .crm-contact-row');
  rows.forEach((row) => {
    const get = (name) => {
      const input = row.querySelector(`[data-field="${name}"]`);
      return input ? input.value.trim() : '';
    };
    const id = get('id');
    const name = get('name');
    const role = get('role');
    const phone = get('phone');
    const email = get('email');
    const primaryInput = row.querySelector('[data-field="isPrimary"]');
    const isPrimary = !!(primaryInput && primaryInput.checked);

    // Skip a fully-empty row (a blank starter row the user never touched).
    if (!name && !role && !phone && !email) return;

    const contact = { name, role, phone, email, isPrimary };
    // Carry an existing id through so edits update in place rather than duplicate.
    if (id) contact.id = id;
    contacts.push(contact);
  });

  const qvEnabled = !!document.getElementById('quickvisit-toggle')?.checked;

  return {
    name: val('field-name'),
    neighborhood: val('field-neighborhood'),
    address: val('field-address'),
    venueType: val('field-venuetype'),
    status: val('field-status') || 'active',
    notes: val('field-notes'),
    scores,
    contacts,
    quickVisit: {
      enabled: qvEnabled,
      reception: radioVal('qv-reception') || 'lukewarm',
      notes: (document.getElementById('qv-notes')?.value ?? '').trim(),
    },
  };
}

// ── renderActivity ──────────────────────────────────────────────
// Fill #activity-list newest-first. Each entry is a timestamp + message, both
// textContent. The store hands us the log already capped + newest-first.
export function renderActivity(log) {
  const listEl = document.getElementById('activity-list');
  listEl.textContent = '';

  // Use a DocumentFragment to batch DOM insertions, minimizing reflows
  // Expected to significantly reduce render time for large activity logs.
  const fragment = document.createDocumentFragment();

  for (const entry of log) {
    const li = document.createElement('li');
    li.className = 'crm-activity-item';

    const time = document.createElement('span');
    time.className = 'crm-activity-time';
    // Relative when recent, absolute fallback for older entries.
    const since = getTimeSince(entry.timestamp);
    time.textContent = since.days <= 7
      ? since.formatted
      : new Date(entry.timestamp).toLocaleString();
    time.setAttribute('title', new Date(entry.timestamp).toLocaleString());

    const msg = document.createElement('span');
    msg.className = 'crm-activity-msg';
    msg.textContent = entry.message;

    li.appendChild(time);
    li.appendChild(msg);
    fragment.appendChild(li);
  }

  listEl.appendChild(fragment);
}

// ── mergeNeighborhoods ──────────────────────────────────────────
// Add any neighborhoods present in the data but not already an <option> in
// #neighborhood-options, so the datalist autocompletes real areas the user has
// actually entered (on top of the canonical metro list seeded in crm.html).
export function mergeNeighborhoods(leads) {
  const datalist = document.getElementById('neighborhood-options');
  if (!datalist) return;

  const existing = new Set(
    Array.from(datalist.options).map((o) => o.value.toLowerCase())
  );

  for (const lead of leads) {
    const n = (lead.neighborhood || '').trim();
    if (n && !existing.has(n.toLowerCase())) {
      const opt = document.createElement('option');
      opt.value = n; // .value is a safe sink (no HTML parsing)
      datalist.appendChild(opt);
      existing.add(n.toLowerCase());
    }
  }
}

// ── mergeVenueTypes ─────────────────────────────────────────────
// Same idea as mergeNeighborhoods, for the venue-type combobox: remember any
// type the user has actually typed (on top of the starter list in crm.html), so
// it autocompletes next time. Free text + suggestions, exactly like the area field.
export function mergeVenueTypes(leads) {
  const datalist = document.getElementById('venuetype-options');
  if (!datalist) return;

  const existing = new Set(
    Array.from(datalist.options).map((o) => o.value.toLowerCase())
  );

  for (const lead of leads) {
    const t = (lead.venueType || '').trim();
    if (t && !existing.has(t.toLowerCase())) {
      const opt = document.createElement('option');
      opt.value = t; // .value is a safe sink (no HTML parsing)
      datalist.appendChild(opt);
      existing.add(t.toLowerCase());
    }
  }
}

// ── setSyncStatus ───────────────────────────────────────────────
// Reflect the sync engine's state in #drive-status: friendly text + a status
// class. The four states map straight off sync.js's onStatus callback.
const SYNC_TEXT = {
  'local-only': 'Saved on this phone',
  'pending': 'Saving…',
  'synced': 'Backed up to Drive',
  'error': 'Sync paused — saved here',
};
const SYNC_CLASS = {
  'local-only': 'crm-status--local',
  'pending': 'crm-status--pending',
  'synced': 'crm-status--synced',
  'error': 'crm-status--error',
};

export function setSyncStatus(status) {
  const el = document.getElementById('drive-status');
  if (!el) return;
  setText(el, SYNC_TEXT[status] || SYNC_TEXT['local-only']);
  // Reset the status modifier classes, then apply the current one. We keep the
  // base 'crm-status' class and only swap the --state modifier.
  el.classList.remove('crm-status--local', 'crm-status--pending', 'crm-status--synced', 'crm-status--error');
  el.classList.add(SYNC_CLASS[status] || SYNC_CLASS['local-only']);
}
