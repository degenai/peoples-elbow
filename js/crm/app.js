// ============================================
// Lead-o-Tron v2 — app.js (the entry point / orchestrator)
//
// app.js owns the wiring, nobody else does. It:
//   - builds the store (truth), auth (Google token), sync (Drive backup);
//   - subscribes to the store and re-renders the list on every change;
//   - owns filtering + sorting as a pure function over store.getLeads();
//   - opens/closes the sheets, traps focus, handles Escape/backdrop;
//   - translates DOM events into store mutations (capture-first: name is the only
//     required field; everything else is deferrable);
//   - routes between the list view and the route planner via the URL hash.
//
// Modules below are SINGLE-RESPONSIBILITY: render.js builds DOM (no state),
// store.js holds state (no DOM), sync/auth talk to Google (no DOM), route.js owns
// the planner, motion.js is optional flourish. app.js is the only place they meet.
//
// Everything degrades: no token → local-only CRM; motion fails → static page;
// GIS blocked → sign-in just doesn't help, capture still works.
// ============================================

import { createStore } from './store.js';
import { createSync } from './sync.js';
import { createAuth } from './auth.js';
import {
  renderList,
  renderDetail,
  fillForm,
  readForm,
  addContactRow,
  renderActivity,
  mergeNeighborhoods,
  setSyncStatus,
} from './render.js';
import { createRoute } from './route.js';
import { motion } from './motion.js';
import { parseLeadEmail } from './email-lead-parser.js';

// Alex's OAuth client id (public — it's a browser client id, not a secret).
const CLIENT_ID = '350811251793-a740bu9llt1pf4ecaqfkiapl11entqrm.apps.googleusercontent.com';

const CONFIG_KEY = 'leadOTronConfig';

// ── construct the core trio ─────────────────────────────────────
const store = createStore();

const auth = createAuth({
  clientId: CLIENT_ID,
  // A fresh token arrived → establish/refresh the Drive link. connect() MERGES,
  // it never overwrites local captures (see sync.js). If we're still showing demo
  // data, clear it first so signing in NEVER pushes the fictional demo set to the
  // user's Drive — connect() then merges any real Drive file in, or creates empty.
  onToken: () => {
    if (store.isDemo()) store.clearDemo();
    sync.connect();
    reflectAuthUI();
  },
  // The token lapsed. Drop to local-only and nudge a reconnect; capture is fine.
  onExpired: () => {
    setSyncStatus('local-only');
    reflectAuthUI();
    toast('Drive sign-in expired — tap "Sign in to back up" to resume.', 'info');
  },
  // Popup blocked / wrong origin / consent denied. Tell the user plainly; never
  // leave a button that "does nothing".
  onError: (type) => {
    reflectAuthUI();
    const msg = type === 'popup_closed' || type === 'popup_failed_to_open'
      ? 'Sign-in popup was blocked or closed. Try again.'
      : 'Could not sign in to Google. You can keep using the app offline.';
    toast(msg, 'error');
  },
});

const sync = createSync({
  store,
  auth,
  onStatus: (s) => setSyncStatus(s),
});

const route = createRoute({ store });

// ── filtering + sorting (pure over store.getLeads()) ────────────
// The single source of "which leads show, in what order" — read straight off the
// filter controls each call. Kept pure (no side effects) so it's trivially
// testable and never fights the render.
function getVisibleLeads() {
  const leads = store.getLeads();

  const status = byId('filter-status').value;
  const time = byId('filter-time').value;
  const neighborhood = byId('filter-neighborhood').value.trim().toLowerCase();
  const minScore = parseInt(byId('filter-minscore').value, 10) || 0;
  const reception = byId('filter-reception').value;
  const search = byId('search-input').value.trim().toLowerCase();
  const sort = byId('sort-select').value;

  const now = Date.now();

  const filtered = leads.filter((lead) => {
    if (status !== 'all' && lead.status !== status) return false;

    if (time !== 'all') {
      const days = daysSince(lead.lastVisit, now);
      switch (time) {
        case 'week': if (days > 7) return false; break;
        case 'due1': if (days < 7) return false; break;
        case 'due2': if (days < 14) return false; break;
        case 'due3': if (days < 21) return false; break;
        case 'due4': if (days < 30) return false; break;
        case 'never': if (lead.lastVisit) return false; break;
        default: break;
      }
    }

    if (neighborhood && (lead.neighborhood || '').toLowerCase() !== neighborhood) return false;
    if ((lead.totalScore || 0) < minScore) return false;

    if (reception !== 'all') {
      if (lastReception(lead) !== reception) return false;
    }

    if (search) {
      if (matchesSearch(lead, search)) return true;
      return false;
    }
    return true;
  });

  return sortLeads(filtered, sort);
}

function matchesSearch(lead, q) {
  if (lead.name && lead.name.toLowerCase().includes(q)) return true;
  if (lead.address && lead.address.toLowerCase().includes(q)) return true;
  if (lead.neighborhood && lead.neighborhood.toLowerCase().includes(q)) return true;
  for (const c of lead.contacts || []) {
    if (c.name && c.name.toLowerCase().includes(q)) return true;
    if (c.phone && String(c.phone).toLowerCase().includes(q)) return true;
    if (c.email && c.email.toLowerCase().includes(q)) return true;
  }
  return false;
}

function sortLeads(leads, sort) {
  const arr = leads.slice();
  const byStr = (a, b) => a.localeCompare(b);
  switch (sort) {
    case 'name':
      return arr.sort((a, b) => byStr((a.name || '').toLowerCase(), (b.name || '').toLowerCase()));
    case 'neighborhood':
      return arr.sort((a, b) => byStr((a.neighborhood || '').toLowerCase(), (b.neighborhood || '').toLowerCase()));
    case 'score':
      return arr.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    case 'created':
      return arr.sort((a, b) => String(b.created).localeCompare(String(a.created)));
    case 'stale':
      // Oldest last-visit first; never-visited are the most stale → front.
      return arr.sort((a, b) => timeKey(a.lastVisit) - timeKey(b.lastVisit));
    case 'recent':
    default:
      // Newest last-visit first; never-visited sink to the bottom.
      return arr.sort((a, b) => timeKey(b.lastVisit) - timeKey(a.lastVisit));
  }
}

// For "recent" sort: a real date → its epoch; never-visited → -Infinity so it
// sorts to the bottom of newest-first and the top of oldest-first.
function timeKey(iso) {
  if (!iso) return -Infinity;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : -Infinity;
}

function daysSince(iso, now = Date.now()) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Infinity;
  return Math.floor((now - t) / 86400000);
}

function lastReception(lead) {
  const visits = Array.isArray(lead.visits) ? lead.visits : [];
  if (!visits.length) return null;
  let best = null;
  let bestTime = -Infinity;
  for (const v of visits) {
    const t = Date.parse(v.date);
    if (Number.isFinite(t) && t >= bestTime) { bestTime = t; best = v; }
  }
  return best ? best.reception : null;
}

// ── the render pass (store subscription) ────────────────────────
// One function, called on every store change AND on filter changes. Re-derives
// the visible list and paints. The store is the only source of leads — we never
// hold an array of our own.
function refresh() {
  const visible = getVisibleLeads();
  renderList(visible);
  mergeNeighborhoods(store.getLeads());

  // Demo banner: only when the store is showing untouched demo data.
  const demo = store.isDemo();
  byId('demo-banner').classList.toggle('hidden', !demo);

  // The optional rise-in flourish. Wrapped: the app must work if motion is a no-op.
  try { motion.listIn(byId('lead-list')); } catch { /* motion is optional */ }
}

// Activity is cheaper to render on its own; the subscription calls both.
function refreshActivity() {
  renderActivity(store.getActivityLog());
}

// ── tiny DOM utilities ──────────────────────────────────────────
function byId(id) { return document.getElementById(id); }

// Non-blocking toast (we never use native alert()/confirm() — they're awful on a
// phone and block the event loop). Auto-dismisses; stacks are fine.
let toastContainer = null;
function toast(message, kind = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'crm-toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }
  const t = document.createElement('div');
  t.className = `crm-toast crm-toast--${kind}`;
  t.textContent = message; // textContent: a toast message is never raw HTML
  toastContainer.appendChild(t);
  // Fade-and-remove after a few seconds. requestAnimationFrame to allow a CSS
  // enter transition to catch.
  requestAnimationFrame(() => t.classList.add('crm-toast--in'));
  setTimeout(() => {
    t.classList.remove('crm-toast--in');
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

// ── sheet (modal) management: open/close, focus trap, Escape, backdrop ──
// A small stack so nested sheets (detail → confirm) restore focus correctly.
const sheetStack = [];

function openSheet(id, opener) {
  const sheet = byId(id);
  if (!sheet) return;
  // Already open? Do nothing. A double-trigger must never push a duplicate stack
  // entry — that desyncs Escape/backdrop/focus-trap against a phantom sheet.
  if (sheetStack.some((s) => s.id === id)) return;

  const wasEmpty = sheetStack.length === 0;
  sheet.hidden = false;
  sheetStack.push({ id, opener: opener || document.activeElement });
  // Lock page scroll while any sheet is open so the list behind can't scroll.
  if (wasEmpty) document.body.classList.add('crm-modal-open');

  // Focus the first sensible control inside the panel.
  const focusable = getFocusable(sheet);
  if (focusable.length) focusable[0].focus();

  // The optional sheet-pop flourish.
  try { motion.sheetIn(sheet.querySelector('.crm-sheet-panel')); } catch { /* optional */ }
}

function closeSheet(id) {
  const sheet = id ? byId(id) : (sheetStack.length ? byId(sheetStack[sheetStack.length - 1].id) : null);
  if (!sheet) return;
  sheet.hidden = true;

  // Pop from the stack and restore focus to whatever opened it.
  const idx = sheetStack.findIndex((s) => s.id === sheet.id);
  let entry = null;
  if (idx !== -1) entry = sheetStack.splice(idx, 1)[0];
  if (entry && entry.opener && typeof entry.opener.focus === 'function') {
    entry.opener.focus();
  }
  // Unlock page scroll once the last sheet closes (nested sheets keep it locked).
  if (sheetStack.length === 0) document.body.classList.remove('crm-modal-open');
}

function topSheet() {
  return sheetStack.length ? sheetStack[sheetStack.length - 1].id : null;
}

function getFocusable(root) {
  return Array.from(root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

// Global key handler: Escape closes the top sheet; Tab is trapped within it.
document.addEventListener('keydown', (e) => {
  const id = topSheet();
  if (!id) return;
  const sheet = byId(id);

  if (e.key === 'Escape') {
    e.preventDefault();
    closeSheet(id);
    return;
  }
  if (e.key === 'Tab') {
    const focusable = getFocusable(sheet);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
});

// Any click on a [data-close] control or on the sheet backdrop (the element with
// the dialog role itself, outside the panel) closes that sheet.
document.addEventListener('click', (e) => {
  const closer = e.target.closest('[data-close]');
  if (closer) {
    const sheet = closer.closest('.crm-sheet');
    if (sheet) { closeSheet(sheet.id); return; }
  }
  // Backdrop click: the .crm-sheet is the full-screen overlay; the .crm-sheet-panel
  // is the card. A click that lands on the overlay but not the panel = backdrop.
  if (e.target.classList && e.target.classList.contains('crm-sheet')) {
    closeSheet(e.target.id);
  }
});

// ── confirm sheet (replaces native confirm() for deletes) ───────
// Returns a promise that resolves true (confirmed) / false (cancelled). We rebind
// the OK button per call so the resolver is fresh.
function confirmAction(message) {
  return new Promise((resolve) => {
    const sheet = byId('confirm-sheet');
    byId('confirm-message').textContent = message;
    const okBtn = byId('confirm-ok');

    const cleanup = () => {
      okBtn.removeEventListener('click', onOk);
      sheet.removeEventListener('click', onCancelClick);
      document.removeEventListener('keydown', onKey, true);
    };
    const finish = (result) => { cleanup(); closeSheet('confirm-sheet'); resolve(result); };
    const onOk = () => finish(true);
    // Cancel happens via data-close / backdrop (handled by the global click) or Esc;
    // we resolve(false) when the sheet gets hidden through those paths.
    const onCancelClick = (e) => {
      if (e.target.closest('[data-close]') || e.target === sheet) finish(false);
    };
    // Capture-phase + stopPropagation so the global Escape handler doesn't ALSO
    // fire on the now-popped stack and close the sheet underneath this confirm.
    const onKey = (e) => {
      if (e.key === 'Escape' && topSheet() === 'confirm-sheet') {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    };

    okBtn.addEventListener('click', onOk);
    sheet.addEventListener('click', onCancelClick);
    document.addEventListener('keydown', onKey, true);

    openSheet('confirm-sheet');
  });
}

// ── datetime-local helpers (LOCAL time, correctly) ──────────────
// <input type="datetime-local"> speaks LOCAL wall-clock time with no zone. To
// prefill it from an ISO string we must shift by the local offset, and to read it
// back to a real ISO we let the Date constructor (which treats a bare datetime as
// local) do the conversion. Getting this wrong is how visits land a day off.
function isoToLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return isoToLocalInput(new Date().toISOString());
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function localInputToIso(value) {
  if (!value) return new Date().toISOString();
  // `new Date('2026-06-11T14:30')` is parsed as LOCAL time → toISOString gives UTC.
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ── lead form (add / edit) ──────────────────────────────────────
// Geolocation captured for the in-progress lead, applied on save. Cleared each
// time the form opens so it never bleeds into the next lead.
let pendingCoords = null;

function openNewLead() {
  pendingCoords = null;
  fillForm(null);
  openSheet('form-sheet');
}

function openEditLead(id) {
  pendingCoords = null;
  const lead = store.getLead(id);
  if (!lead) { toast('That venue no longer exists.', 'error'); return; }
  fillForm(lead);
  openSheet('form-sheet');
}

byId('lead-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = readForm();

  if (!data.name) {
    toast('A venue needs a name.', 'error');
    byId('field-name').focus();
    return;
  }

  const editingId = byId('form-lead-id').value;

  // Build the input the store expects. We pass scores/contacts straight through —
  // the store normalizes (clamps scores, dedupes ids, computes totalScore).
  const input = {
    name: data.name,
    neighborhood: data.neighborhood,
    address: data.address,
    venueType: data.venueType,
    status: data.status,
    notes: data.notes,
    scores: data.scores,
    contacts: data.contacts,
  };
  if (pendingCoords) input.coords = pendingCoords;

  let lead;
  if (editingId) {
    lead = store.updateLead(editingId, input);
    if (lead) store.logActivity(`Updated venue: ${lead.name}`);
  } else {
    lead = store.createLead(input);
    if (lead) store.logActivity(`Added venue: ${lead.name}`);
    // Quick visit: log the visit you just made, if the toggle is on.
    if (lead && data.quickVisit.enabled) {
      store.addVisit(lead.id, {
        reception: data.quickVisit.reception,
        notes: data.quickVisit.notes,
      });
      store.logActivity(`Logged a ${data.quickVisit.reception} visit to ${lead.name}`);
    }
  }

  pendingCoords = null;
  closeSheet('form-sheet');
});

// "Add contact" button inside the form.
byId('add-contact-btn').addEventListener('click', () => addContactRow());

// Remove-contact (delegated) — the row's × button carries data-action.
byId('contacts-list').addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-action="remove-contact"]');
  if (!removeBtn) return;
  const rows = byId('contacts-list').querySelectorAll('.crm-contact-row');
  // Always leave at least one row so there's somewhere to type.
  if (rows.length <= 1) {
    const row = removeBtn.closest('.crm-contact-row');
    row.querySelectorAll('input').forEach((i) => { i.value = ''; i.checked = false; });
    return;
  }
  removeBtn.closest('.crm-contact-row')?.remove();
});

// Quick-visit toggle reveals its fields.
byId('quickvisit-toggle').addEventListener('change', (e) => {
  byId('quickvisit-fields').hidden = !e.target.checked;
});

// ── lead detail ─────────────────────────────────────────────────
// List uses event delegation: a click or Enter on a card opens its detail.
byId('lead-list').addEventListener('click', (e) => {
  const card = e.target.closest('.crm-lead-card');
  if (card && card.dataset.id) openDetail(card.dataset.id);
});
byId('lead-list').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.crm-lead-card');
  if (card && card.dataset.id) { e.preventDefault(); openDetail(card.dataset.id); }
});

let currentDetailId = null;
function openDetail(id) {
  const lead = store.getLead(id);
  if (!lead) { toast('That venue no longer exists.', 'error'); return; }
  currentDetailId = id;
  renderDetail(lead);
  openSheet('lead-sheet');
}

// Detail-sheet actions (delegated): edit/delete lead, add/edit/delete visit.
byId('lead-sheet-body').addEventListener('click', async (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl || !currentDetailId) return;
  const action = actionEl.getAttribute('data-action');
  const id = currentDetailId;

  if (action === 'edit-lead') {
    closeSheet('lead-sheet');
    openEditLead(id);
  } else if (action === 'delete-lead') {
    const lead = store.getLead(id);
    const ok = await confirmAction(`Delete "${lead ? lead.name : 'this venue'}"? This can't be undone.`);
    if (!ok) return;
    store.deleteLead(id);
    if (lead) store.logActivity(`Deleted venue: ${lead.name}`);
    closeSheet('lead-sheet');
  } else if (action === 'add-visit') {
    openVisit(id, null);
  } else if (action === 'edit-visit') {
    openVisit(id, actionEl.dataset.visitId);
  } else if (action === 'delete-visit') {
    const visitId = actionEl.dataset.visitId;
    const ok = await confirmAction('Delete this visit?');
    if (!ok) return;
    store.deleteVisit(id, visitId);
    store.logActivity('Deleted a visit');
    // Re-render the (still open) detail so the visit list updates immediately.
    const fresh = store.getLead(id);
    if (fresh) renderDetail(fresh);
  }
});

// ── visit form (log / edit a visit) ─────────────────────────────
function openVisit(leadId, visitId) {
  byId('visit-lead-id').value = leadId;
  byId('visit-id').value = visitId || '';

  if (visitId) {
    const lead = store.getLead(leadId);
    const visit = lead && (lead.visits || []).find((v) => v.id === visitId);
    if (visit) {
      byId('visit-date').value = isoToLocalInput(visit.date);
      byId('visit-notes').value = visit.notes || '';
      const recRadio = document.querySelector(`input[name="visit-reception"][value="${visit.reception}"]`);
      if (recRadio) recRadio.checked = true;
    }
    byId('visit-title').textContent = 'Edit visit';
  } else {
    byId('visit-form').reset();
    byId('visit-lead-id').value = leadId; // reset() cleared the hidden inputs
    byId('visit-id').value = '';
    byId('visit-date').value = isoToLocalInput(new Date().toISOString());
    byId('visit-title').textContent = 'Log a visit';
  }
  openSheet('visit-sheet');
}

byId('visit-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const leadId = byId('visit-lead-id').value;
  const visitId = byId('visit-id').value;
  const recChecked = document.querySelector('input[name="visit-reception"]:checked');
  const patch = {
    date: localInputToIso(byId('visit-date').value),
    notes: byId('visit-notes').value.trim(),
    reception: recChecked ? recChecked.value : 'lukewarm',
  };

  if (visitId) {
    store.updateVisit(leadId, visitId, patch);
    store.logActivity('Updated a visit');
  } else {
    store.addVisit(leadId, patch);
    const lead = store.getLead(leadId);
    store.logActivity(`Logged a ${patch.reception} visit${lead ? ` to ${lead.name}` : ''}`);
  }

  closeSheet('visit-sheet');
  // If the detail sheet for this lead is still open underneath, refresh it.
  if (currentDetailId === leadId && !byId('lead-sheet').hidden) {
    const fresh = store.getLead(leadId);
    if (fresh) renderDetail(fresh);
  }
});

// ── new-lead entry points ───────────────────────────────────────
byId('new-lead-fab').addEventListener('click', openNewLead);
// Other [data-action="new-lead"] triggers (e.g. the empty-state button).
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-action="new-lead"]');
  if (trigger) openNewLead();
});

// ── filters + search + sort ─────────────────────────────────────
// Search is debounced so we don't re-filter on every keystroke.
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

byId('search-input').addEventListener('input', debounce(refresh, 200));
['filter-status', 'filter-time', 'filter-neighborhood', 'filter-reception', 'sort-select'].forEach((id) => {
  byId(id).addEventListener('change', refresh);
});
byId('filter-minscore').addEventListener('input', (e) => {
  byId('filter-minscore-out').textContent = e.target.value;
  refresh();
});

// Filter drawer toggle (aria-expanded reflects state).
byId('filter-toggle').addEventListener('click', () => {
  const drawer = byId('filter-drawer');
  const open = drawer.hidden;
  drawer.hidden = !open;
  byId('filter-toggle').setAttribute('aria-expanded', String(open));
});

// "Reset filters" honestly restores the PAGE defaults (matching the HTML).
byId('clear-filters-btn').addEventListener('click', () => {
  byId('filter-status').value = 'active';
  byId('filter-time').value = 'all';
  byId('filter-neighborhood').value = '';
  byId('filter-minscore').value = '3';
  byId('filter-minscore-out').textContent = '3';
  byId('filter-reception').value = 'all';
  byId('search-input').value = '';
  byId('sort-select').value = 'recent';
  refresh();
});

// ── activity log sheet ──────────────────────────────────────────
byId('activity-btn').addEventListener('click', () => {
  refreshActivity();
  openSheet('activity-sheet');
});

// ── settings sheet ──────────────────────────────────────────────
function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveConfig(patch) {
  const cfg = { ...loadConfig(), ...patch };
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  return cfg;
}

byId('settings-btn').addEventListener('click', () => {
  const cfg = loadConfig();
  byId('setting-start-address').value = cfg.startAddress || '';
  byId('setting-country').value = cfg.country || '';
  openSheet('settings-sheet');
});
// Persist settings on change (no explicit save button for these two).
byId('setting-start-address').addEventListener('change', (e) => saveConfig({ startAddress: e.target.value.trim() }));
byId('setting-country').addEventListener('change', (e) => saveConfig({ country: e.target.value.trim().toLowerCase() }));

// Paste-email → lead. parseLeadEmail returns { lead, warnings } | null.
byId('paste-email-btn').addEventListener('click', () => {
  const text = byId('paste-email-text').value;
  const result = parseLeadEmail(text);
  if (!result || !result.lead || !result.lead.name) {
    toast('No lead found in that text.', 'error');
    return;
  }
  const lead = store.createLead(result.lead);
  store.logActivity(`Added ${lead.name} from website`);
  byId('paste-email-text').value = '';
  toast(`Added ${lead.name} from website`, 'success');
  for (const w of result.warnings || []) console.warn('parseLeadEmail:', w);
});

// ── export / import ─────────────────────────────────────────────
function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has grabbed the URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportNow() {
  const today = new Date().toISOString().slice(0, 10);
  downloadJson(store.exportData(), `leadotron-${today}.json`);
  toast('Exported your data.', 'success');
}
byId('export-btn').addEventListener('click', exportNow);
byId('export-btn-2').addEventListener('click', exportNow);

// Import: the file input is hidden; both the toolbar button and the demo-banner
// button trigger it; the change handler reads + parses + hands to the store.
byId('import-btn').addEventListener('click', () => byId('import-file').click());
byId('demo-import-btn').addEventListener('click', () => byId('import-file').click());
byId('import-file').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); }
    catch { toast('That file is not valid JSON.', 'error'); e.target.value = ''; return; }
    const res = store.importData(parsed);
    if (res.ok) {
      store.logActivity(`Imported ${res.count} venues`);
      toast(`Imported ${res.count} venue${res.count === 1 ? '' : 's'}.`, 'success');
    } else {
      toast(res.error || 'Import failed.', 'error');
    }
    e.target.value = ''; // let the same file be picked again later
  };
  reader.onerror = () => { toast('Could not read that file.', 'error'); e.target.value = ''; };
  reader.readAsText(file);
});

// ── demo banner controls ────────────────────────────────────────
byId('demo-clear-btn').addEventListener('click', () => {
  store.clearDemo();
  store.logActivity('Started a fresh, empty CRM');
});
// demo-import-btn wired above (shares the import input).

// ── Drive sign-in / sign-out ────────────────────────────────────
// signIn() MUST run inside the click handler (iOS popup rule) — so we call it
// directly here, never behind an await.
byId('sign-in-btn').addEventListener('click', () => auth.signIn());
byId('demo-signin-btn').addEventListener('click', () => auth.signIn());
byId('sign-out-btn').addEventListener('click', () => {
  auth.signOut();
  sync.reset();
  reflectAuthUI();
  toast('Signed out. Your data stays on this device.', 'info');
});

// Show the right sign-in/out button + status for the current auth state.
function reflectAuthUI() {
  const authed = auth.isAuthed();
  byId('sign-in-btn').classList.toggle('hidden', authed);
  byId('sign-out-btn').classList.toggle('hidden', !authed);
}

// ── geolocation ("Use my location") ─────────────────────────────
function withPosition(onOk) {
  if (!navigator.geolocation) { toast('Location is not available on this device.', 'error'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => onOk(pos.coords.latitude, pos.coords.longitude),
    () => toast('Location permission denied.', 'error'),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}
// In the lead form: stash coords for the in-progress lead (applied on save).
byId('use-location-btn').addEventListener('click', () => {
  withPosition((lat, lon) => {
    pendingCoords = { lat, lon, approximate: false };
    toast('Location captured for this venue.', 'success');
  });
});
// (#use-location-route is owned by route.js's wire() — NOT wired here, so a tap
// doesn't fire geolocation twice from two modules.)

// ── route view ↔ list view (hash-routed) ────────────────────────
// The hash is the source of truth so the PWA / a deep-link to '#route' works and
// the back button moves between views. We never hide content irrecoverably.
function showRoute() {
  byId('list-view').classList.add('hidden');
  byId('route-view').classList.remove('hidden');
  try { route.enter(); } catch (err) { console.error('route.enter failed', err); }
}
function showList() {
  byId('route-view').classList.add('hidden');
  byId('list-view').classList.remove('hidden');
}
function applyHash() {
  if (location.hash === '#route') showRoute();
  else showList();
}
byId('route-btn').addEventListener('click', () => { location.hash = 'route'; });
byId('route-back-btn').addEventListener('click', () => {
  // Pop the pushed #route entry so the browser's own Back stays coherent with the
  // in-app Back; the resulting hashchange runs applyHash() -> showList().
  if (location.hash === '#route') history.back();
  else showList();
});
window.addEventListener('hashchange', applyHash);

// ── lifecycle: token expiry checks + flush on leave ─────────────
// Periodically and on foreground, verify the token hasn't lapsed (fires onExpired
// once per lapse, which drops us to local-only).
setInterval(() => auth.checkExpiry(), 60000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    auth.checkExpiry();
  } else {
    // Leaving/backgrounding: push any queued changes before the tab can be frozen.
    sync.flushNow();
  }
});
window.addEventListener('pagehide', () => sync.flushNow());

// ── boot ────────────────────────────────────────────────────────
// Subscribe BEFORE init so the first emit paints the screen. Capture-first: the
// store loads from localStorage synchronously, so leads are on screen with zero
// network and zero Google token.
store.subscribe(() => { refresh(); refreshActivity(); });
store.init();

// Reflect a restored session's auth state, then once GIS is ready, connect Drive
// if we already hold a valid token (a reload mid-session shouldn't need a click).
reflectAuthUI();
// Paint the sync badge from the engine's actual state, not the HTML literal.
setSyncStatus(sync.getStatus());
auth.ready(() => {
  reflectAuthUI();
  if (auth.isAuthed()) sync.connect();
});

// Honor a deep-linked '#route' on first load.
applyHash();

// PWA: register the service worker after load so it never blocks first paint.
// Catch + log only — a failed SW registration must not break the app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker registration failed (app still works):', err);
    });
  });
}
