// ============================================
// Lead-o-Tron v2 — the store: the ONE source of truth for CRM data.
//
// Why this exists: the v1 port smeared state across CrmApi.localState, a second
// `leads` array the renderer held by reference, and localStorage. Mutating one
// mutated the others, which is literally how every new lead got saved twice and
// every activity-log line doubled. Here, nothing outside this module ever holds
// a reference to the live state: getters return deep clones, mutators run inside
// the store, and the store is the only writer. That single rule deletes a whole
// class of bugs.
//
// Other guarantees:
//  - Normalize on EVERY ingress (load, import, remote merge) — never trust input.
//  - Derived fields (totalScore, lastVisit, updatedAt) are computed at write time,
//    in one place, so the live UI never shows "undefined/15" or a stale score.
//  - localStorage is authoritative and written synchronously, so a captured lead
//    survives with zero network and zero Google token. Drive sync is layered on
//    top by sync.js and is never required for capture.
//  - A corrupt store is BACKED UP before anything resets it (on a phone it may be
//    the only copy of real leads), and we never paper a loss over with demo data
//    once the user has had real data.
// ============================================

import { normalizeLeadsData } from './data-normalizer.js';
import { DEMO_DATA } from './demo-data.js';
import { generateId } from './utils.js';

const STORAGE_KEY  = 'leadOTron_crmData';
const RECOVERY_KEY = 'leadOTron_crmData_recovery';
const HAD_DATA_KEY = 'leadOTron_hadRealData';

const nowISO = () => new Date().toISOString();
const clone = (x) => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)));
const emptyEnvelope = () => ({ schemaVersion: 2, leads: [], activityLog: [] });

// In-memory storage adapter — used by tests and any non-browser context.
export function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

export function createStore({ storage } = {}) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : memoryStorage());
  let state = emptyEnvelope();
  let demo = false;
  const subs = new Set();

  // ── internals ───────────────────────────────────────────────
  function snapshot() { return clone(state); }
  function emit() { const snap = snapshot(); subs.forEach((fn) => { try { fn(snap, demo); } catch (e) { console.error(e); } }); }

  function persist() {
    try { store.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.error('Lead-o-Tron: could not persist to storage', e); }
  }

  // Re-normalize the whole envelope (fills derived fields, validates, dedupes
  // ids) then persist + notify. Every mutator ends here, so derived state has
  // exactly one owner.
  function commit({ markReal = true } = {}) {
    const { data } = normalizeLeadsData(state);
    state = data;
    if (markReal) { try { store.setItem(HAD_DATA_KEY, '1'); } catch { /* ignore */ } }
    persist();
    emit();
  }

  // Demo leads are fictional; the first real edit replaces them with an empty
  // real dataset before applying the change, so fiction never mixes into data.
  function ensureReal() {
    if (demo) { state = emptyEnvelope(); demo = false; }
  }

  function findLead(id) { return state.leads.find((l) => l.id === id) || null; }

  // ── lifecycle ───────────────────────────────────────────────
  function init() {
    const raw = store.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const { data, needsSave } = normalizeLeadsData(JSON.parse(raw));
        state = data;
        demo = false;            // anything we persisted is real, never demo
        if (needsSave) persist();
        emit();
        return;
      } catch (e) {
        // Corrupt JSON. Back it up before we touch anything — never silently wipe.
        try { store.setItem(RECOVERY_KEY, raw); } catch { /* ignore */ }
        console.error('Lead-o-Tron: stored data was unreadable; backed up to recovery key', e);
      }
    }
    // No store, or corrupt-and-backed-up. If the user has had real data before,
    // boot EMPTY so a storage eviction surfaces as "empty + reconnect", not as
    // plausible fake businesses. Only a truly first-time visitor sees demo data.
    const hadReal = store.getItem(HAD_DATA_KEY) === '1';
    if (hadReal) { state = emptyEnvelope(); demo = false; persist(); emit(); }
    else { state = normalizeLeadsData(clone(DEMO_DATA)).data; demo = true; emit(); }
  }

  // ── reads (always cloned — no caller ever touches live state) ─
  function getState() { return snapshot(); }
  function getLeads() { return clone(state.leads); }
  function getLead(id) { const l = findLead(id); return l ? clone(l) : null; }
  function getActivityLog() { return clone(state.activityLog); }
  function isDemo() { return demo; }
  function recoveredBlob() { return store.getItem(RECOVERY_KEY); }

  // ── lead mutations ──────────────────────────────────────────
  function createLead(input = {}) {
    ensureReal();
    const lead = {
      ...input,
      id: generateId(),
      created: nowISO(),
      updatedAt: nowISO(),
      contacts: Array.isArray(input.contacts) ? input.contacts : [],
      visits: Array.isArray(input.visits) ? input.visits : [],
    };
    state.leads.push(lead);
    commit();
    return getLead(lead.id);
  }

  function updateLead(id, patch = {}) {
    const lead = findLead(id);
    if (!lead) return null;
    Object.assign(lead, patch, { id, updatedAt: nowISO() });
    commit();
    return getLead(id);
  }

  function updateLeads(updates = []) {
    let updatedCount = 0;
    for (const { id, patch } of updates) {
      const lead = findLead(id);
      if (lead) {
        Object.assign(lead, patch || {}, { id, updatedAt: nowISO() });
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      commit();
    }
    return updatedCount > 0;
  }

  function deleteLead(id) {
    const before = state.leads.length;
    state.leads = state.leads.filter((l) => l.id !== id);
    if (state.leads.length === before) return false;
    commit();
    return true;
  }

  // ── visit mutations (date defaults to now AT THE DATA LAYER, so the fast
  //    "add venue + log the visit I just made" path can never store a dateless
  //    visit that the loader later backfills with the wrong day) ─────────────
  function addVisit(leadId, visit = {}) {
    const lead = findLead(leadId);
    if (!lead) return null;
    lead.visits = Array.isArray(lead.visits) ? lead.visits : [];
    lead.visits.push({
      id: generateId(),
      date: visit.date || nowISO(),
      notes: visit.notes || '',
      reception: visit.reception || 'lukewarm',
    });
    lead.updatedAt = nowISO();
    commit(); // recomputes lastVisit = max(visit dates)
    return getLead(leadId);
  }

  function updateVisit(leadId, visitId, patch = {}) {
    const lead = findLead(leadId);
    if (!lead) return null;
    const v = (lead.visits || []).find((x) => x.id === visitId);
    if (!v) return null;
    Object.assign(v, patch, { id: visitId });
    lead.updatedAt = nowISO();
    commit();
    return getLead(leadId);
  }

  function deleteVisit(leadId, visitId) {
    const lead = findLead(leadId);
    if (!lead) return null;
    lead.visits = (lead.visits || []).filter((x) => x.id !== visitId);
    lead.updatedAt = nowISO();
    commit();
    return getLead(leadId);
  }

  // ── activity log (capped; single write — no second persist like v1) ─
  function logActivity(message) {
    // Never write while showing demo data: persist() saves the whole envelope
    // (demo leads included), and on next load that blob reads back as real. Every
    // real caller logs AFTER a mutator that already cleared demo, so this only
    // blocks a stray log-before-mutate from defeating the demo guard.
    if (demo) return;
    state.activityLog.unshift({ timestamp: nowISO(), message: String(message) });
    state.activityLog = state.activityLog.slice(0, 100);
    persist();
    emit();
  }

  // ── bulk ingress ────────────────────────────────────────────
  function importData(obj) {
    if (!obj || !Array.isArray(obj.leads)) return { ok: false, error: 'Not a CRM export (missing leads array).' };
    ensureReal();
    const { data } = normalizeLeadsData(obj);
    state = data;
    demo = false;
    commit();
    return { ok: true, count: state.leads.length };
  }

  function exportData() { return snapshot(); }

  // Replace everything (used after an explicit "load from Drive, discard local").
  function replaceAll(envelope) {
    const { data } = normalizeLeadsData(envelope || emptyEnvelope());
    state = data;
    demo = false;
    commit();
  }

  // Non-destructive merge of a remote Drive copy into local. Last-write-wins per
  // lead on updatedAt; visits unioned by id; activity logs unioned + capped.
  // This is the anti-data-loss core: signing in NEVER overwrites local captures,
  // it reconciles them. (Known v2 limitation: union has no tombstones, so a lead
  // deleted on one device can reappear from another device's older copy. Far
  // safer than the v1 behavior of wiping a whole side; documented for v3.)
  function mergeRemote(envelope) {
    ensureReal();
    const { data: remote } = normalizeLeadsData(envelope || emptyEnvelope());
    const byId = new Map(state.leads.map((l) => [l.id, l]));
    for (const r of remote.leads) {
      const l = byId.get(r.id);
      if (!l) { byId.set(r.id, r); continue; }
      const winner = new Date(r.updatedAt || 0) >= new Date(l.updatedAt || 0) ? clone(r) : clone(l);
      winner.visits = unionVisits(l.visits, r.visits);
      byId.set(r.id, winner);
    }
    state.leads = [...byId.values()];
    state.activityLog = unionLog(state.activityLog, remote.activityLog);
    commit();
  }

  // ── demo controls ───────────────────────────────────────────
  function clearDemo() { state = emptyEnvelope(); demo = false; commit(); }

  // ── subscription ────────────────────────────────────────────
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

  return {
    init, subscribe,
    getState, getLeads, getLead, getActivityLog, isDemo, recoveredBlob,
    createLead, updateLead, updateLeads, deleteLead,
    addVisit, updateVisit, deleteVisit,
    logActivity, importData, exportData, replaceAll, mergeRemote, clearDemo,
  };
}

// Union visit arrays by id; if an id appears on both sides, the later-dated wins.
function unionVisits(a = [], b = []) {
  const byId = new Map();
  for (const v of [...(a || []), ...(b || [])]) {
    if (!v || !v.id) continue;
    const prev = byId.get(v.id);
    if (!prev || new Date(v.date || 0) >= new Date(prev.date || 0)) byId.set(v.id, clone(v));
  }
  return [...byId.values()];
}

// Union activity logs, dedupe on timestamp+message, newest first, cap 100.
function unionLog(a = [], b = []) {
  const seen = new Set();
  const out = [];
  for (const e of [...(a || []), ...(b || [])]) {
    if (!e || typeof e.message !== 'string') continue;
    const key = `${e.timestamp}|${e.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ timestamp: e.timestamp, message: e.message });
  }
  out.sort((x, y) => String(y.timestamp).localeCompare(String(x.timestamp)));
  return out.slice(0, 100);
}
