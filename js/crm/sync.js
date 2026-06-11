// ============================================
// Lead-o-Tron v2 — Drive sync engine.
//
// Contract: capture NEVER depends on this module. The store writes localStorage
// synchronously; sync.js is a background backup that pushes to the user's Drive
// when a token is available. If it never runs, the app is a perfectly good
// local-only CRM.
//
// The four v1 data-loss paths this replaces (all in the old connectDrive):
//  1. first sign-in created an EMPTY Drive file and discarded local leads,
//  2. reconnect after token expiry overwrote local with the stale remote,
//  3. a transient find() error was read as "no file" → empty duplicate created,
//  4. failed saves were swallowed while the badge still said "Synced".
// The rules here: on connect we MERGE (never overwrite); a find() error stops us
// (we never create on an error); first sign-in uploads LOCAL data; and status is
// driven by real results, surfaced as local-only / pending / synced / error.
//
// Status states: 'local-only' (no token), 'pending' (changes queued),
//                'synced' (Drive matches local), 'error' (a sync attempt failed).
// ============================================

import { Drive } from './drive.js';

const FILE_ID_KEY = 'leadOTron_driveFileId';
const DEBOUNCE_MS = 2000;

export function createSync({ store, auth, drive = Drive, onStatus } = {}) {
  let status = 'local-only';
  let dirty = false;
  let timer = null;
  let syncing = false;

  const cachedFileId = () => { try { return localStorage.getItem(FILE_ID_KEY); } catch { return null; } };
  const setFileId = (id) => { try { id ? localStorage.setItem(FILE_ID_KEY, id) : localStorage.removeItem(FILE_ID_KEY); } catch { /* ignore */ } };

  function setStatus(s) { if (s !== status) { status = s; onStatus?.(s); } }
  function getStatus() { return status; }

  // Any local change marks us dirty and (if signed in) schedules a coalesced push.
  // One push per quiet period — not one per keystroke, and never a second write
  // for the activity log the way v1 did.
  store.subscribe(() => {
    if (!auth.isAuthed()) { setStatus('local-only'); return; }
    dirty = true;
    schedule();
  });

  function schedule() {
    if (timer) return;
    setStatus('pending');
    timer = setTimeout(() => { timer = null; flush(); }, DEBOUNCE_MS);
  }

  async function pushTo(fileId, token) {
    const res = await drive.update(fileId, store.exportData(), token);
    if (res.ok) { dirty = false; setStatus('synced'); return true; }
    if (res.status === 401) { setStatus('local-only'); return false; } // token died mid-flight
    setStatus('error');
    return false;
  }

  // Establish the Drive link: find-or-create, merge remote into local, push back.
  // Called when a token first arrives (sign-in / reconnect). Safe to call again.
  async function connect() {
    const token = auth.getToken();
    if (!token) { setStatus('local-only'); return; }
    if (syncing) { dirty = true; return; }
    syncing = true;
    setStatus('pending');
    try {
      const found = await drive.find(token);
      if (!found.ok) { setStatus('error'); return; }      // rule 3: never create on an error

      let id = found.fileId || cachedFileId();
      if (id) {
        const read = await drive.read(id, token);
        if (read.ok && read.data) {
          store.mergeRemote(read.data);                   // rule 2: merge, don't overwrite
        } else if (!read.ok && read.status !== 404) {
          setStatus('error'); return;
        }
        setFileId(id);
        await pushTo(id, token);
      } else {
        const created = await drive.create(store.exportData(), token); // rule 1: upload LOCAL, not empty
        if (!created.ok) { setStatus('error'); return; }
        setFileId(created.fileId);
        dirty = false;
        setStatus('synced');
      }
    } catch (e) {
      console.error('Lead-o-Tron sync.connect failed', e);
      setStatus('error');
    } finally {
      syncing = false;
      if (dirty) schedule();
    }
  }

  // Ongoing background push of local changes to the established file.
  async function flush() {
    const token = auth.getToken();
    if (!token) { setStatus(auth.isAuthed() ? 'pending' : 'local-only'); return; }
    if (syncing) { dirty = true; return; }
    const id = cachedFileId();
    if (!id) { await connect(); return; }                 // not linked yet → do the full handshake
    syncing = true;
    try {
      await pushTo(id, token);
    } catch (e) {
      console.error('Lead-o-Tron sync.flush failed', e);
      setStatus('error');
    } finally {
      syncing = false;
      if (dirty) schedule();
    }
  }

  // Push immediately if there's anything queued — wire this to visibilitychange
  // / pagehide so leaving the page on a phone doesn't strand the last edits.
  function flushNow() { if (dirty && auth.isAuthed()) { if (timer) { clearTimeout(timer); timer = null; } flush(); } }

  function reset() { setFileId(null); dirty = false; setStatus('local-only'); }

  return { connect, flush, flushNow, reset, getStatus };
}
