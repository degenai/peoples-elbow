// ============================================
// Google sign-in for Lead-o-Tron v2 (GIS token client, drive.file scope)
//
// What it owns: getting and holding a Drive access token. Nothing else.
// If this module never runs (GIS blocked, offline, popup denied), the CRM is
// still fully usable — capture writes to localStorage; sync just stays
// "local-only". Auth is a backup feature, never a gate.
//
// Fixes from the v1 port:
//  - error_callback is wired, so a blocked/closed popup or an unauthorized
//    origin produces a real signal instead of a button that "does nothing".
//  - the token lives in memory + sessionStorage, NOT localStorage (an XSS in a
//    long-lived localStorage token is a Drive-account handover).
//  - 60s expiry skew so we never sign a request with a token about to die.
//  - signOut() revokes the grant, it doesn't just forget it.
// ============================================

const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const SKEW_MS = 60 * 1000;
const TOKEN_KEY = 'gis_token';
const TOKEN_EXP_KEY = 'gis_token_expiry';

export function createAuth({
  clientId,
  scope = DEFAULT_SCOPE,
  onToken,     // (accessToken) => void   — a fresh token arrived
  onError,     // (type, raw?) => void    — popup/origin/consent failure
  onExpired,   // () => void              — token lapsed; prompt a reconnect
} = {}) {
  let tokenClient = null;
  let accessToken = null;
  let expiresAt = 0; // ms epoch

  // Restore a still-valid token from this tab's session (survives reload,
  // not subject to localStorage's long-term eviction or cross-tab XSS reach).
  try {
    const t = sessionStorage.getItem(TOKEN_KEY);
    const e = parseInt(sessionStorage.getItem(TOKEN_EXP_KEY) || '0', 10);
    if (t && e > Date.now() + SKEW_MS) { accessToken = t; expiresAt = e; }
  } catch { /* sessionStorage may be unavailable; fine */ }

  function cache(token, expiresInSec) {
    accessToken = token;
    expiresAt = Date.now() + (Number(expiresInSec) || 3600) * 1000;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_EXP_KEY, String(expiresAt));
    } catch { /* ignore */ }
  }

  function clear() {
    accessToken = null;
    expiresAt = 0;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXP_KEY);
    } catch { /* ignore */ }
  }

  function isAuthed() { return !!accessToken && Date.now() < expiresAt - SKEW_MS; }
  function getToken() { return isAuthed() ? accessToken : null; }

  // GIS can load after our module. Returns true once the token client is built.
  function init() {
    if (tokenClient) return true;
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) return false;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (resp) => {
        if (resp.error || !resp.access_token) { onError?.(resp.error || 'no_token', resp); return; }
        cache(resp.access_token, resp.expires_in);
        onToken?.(resp.access_token);
      },
      // The piece the v1 port forgot: surface popup/origin/consent failures.
      error_callback: (err) => { onError?.(err?.type || 'popup_error', err); },
    });
    return true;
  }

  // Poll briefly for the GIS library, then run cb regardless so the app proceeds.
  function ready(cb) {
    if (init()) { cb?.(); return; }
    let tries = 0;
    const iv = setInterval(() => {
      if (init() || ++tries > 50) { clearInterval(iv); cb?.(); }
    }, 200);
  }

  // MUST be called from inside a click handler — iOS Safari blocks the popup
  // otherwise. prompt:'' lets a returning user with a live Google session
  // re-grant near-instantly without the account chooser.
  function signIn() {
    if (!tokenClient && !init()) { onError?.('not_ready'); return; }
    tokenClient.requestAccessToken({ prompt: '' });
  }

  // Force the consent/account chooser (e.g. to switch accounts).
  function signInForce() {
    if (!tokenClient && !init()) { onError?.('not_ready'); return; }
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  function signOut() {
    const t = accessToken;
    clear();
    try {
      if (t && google?.accounts?.oauth2?.revoke) google.accounts.oauth2.revoke(t, () => {});
    } catch { /* ignore */ }
  }

  // Call on a timer / on app foreground. Fires onExpired exactly once per lapse.
  function checkExpiry() {
    if (accessToken && Date.now() >= expiresAt - SKEW_MS) { clear(); onExpired?.(); }
  }

  // Force-expire NOW even if our clock still thinks the token is valid — e.g. Drive
  // returned 401 (the token was revoked server-side). Clears it and fires onExpired
  // once, so the sync engine stops retrying and the user is prompted to reconnect.
  function invalidate() {
    if (!accessToken) return;
    clear();
    onExpired?.();
  }

  return {
    ready, init, signIn, signInForce, signOut,
    getToken, isAuthed, checkExpiry, invalidate,
  };
}
