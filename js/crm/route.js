// route.js — the #route-view controller for Lead-o-Tron v2.
//
// WHY this module exists: a day of door-knocking is wasted if you drive a bad
// loop. This screen turns "leads I haven't visited in a while" into an ordered
// list of stops, a tap-to-open Google Maps link, and a printable notes sheet
// you can carry with no signal. It's the field-ops half of the CRM.
//
// It is a PORT of the old js/crm/utility.js onto the v2 store + cleaned modules.
// The route MATH lives in route-finder.js; the GEOCODING lives in geocoding.js.
// This file is only wiring + DOM: read controls, call those two, render results.
//
// Contract (app.js depends on it):
//   createRoute({ store }) -> { enter() }
//   enter() shows nothing itself (app toggles #route-view visibility). It
//   (re)wires the controls idempotently — safe to call every time the view is
//   shown — and refreshes the eligible-lead count from the current store state.
//
// XSS rule (load-bearing for the "point an AI at the repo" privacy promise):
// never assign untrusted lead data via innerHTML. Stops are built by cloning
// #route-stop-template and setting textContent. The one place we DO build an
// HTML string is the downloadable route-notes file — and there every piece of
// lead data is run through escapeHtml() first.

import { solveRoute, generateGoogleMapsUrl } from './route-finder.js';
import { geocodeAddress, geocodeLeads, DEFAULT_COUNTRY_CODES } from './geocoding.js';
import { getTimeSince } from './utils.js';

// localStorage key shared with the Settings sheet (app.js writes it; we read it).
// Same key the v1 app used, so a returning user keeps their saved start address.
const CONFIG_KEY = 'leadOTronConfig';

// Map the "Include leads due" dropdown values to a minimum age in days.
// 'all' means no recency filter (every lead with an address is eligible).
// These tiers mirror the list-view filter so the two screens agree on "due".
const DUE_TIERS = {
  all: 0,
  due1: 7,
  due2: 14,
  due3: 21,
  due4: 30
};

/**
 * Read the saved config blob from localStorage. Returns {} if missing/corrupt
 * so callers can safely read properties off it without guarding every access.
 */
function readConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    // A corrupt blob shouldn't brick route planning — just treat it as empty.
    return {};
  }
}

/**
 * The country code to constrain geocoding to. Comes from the user's saved
 * config (Settings -> "Geocoding country code"); falls back to the module
 * default ('us') when unset. Empty string is a legitimate value meaning
 * "search worldwide", so we only fall back when the field is truly absent.
 */
function getCountryCodes(config) {
  return typeof config.country === 'string' && config.country.trim()
    ? config.country.trim().toLowerCase()
    : DEFAULT_COUNTRY_CODES;
}

/**
 * HTML-escape for the downloadable route-notes file. This is the ONLY string
 * concatenation path that touches lead data, so every interpolation in the
 * notes template goes through here. (The on-page UI never does this — it uses
 * textContent via the template clone.)
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createRoute({ store }) {
  // --- DOM handles. Grabbed once; the view markup is static. ---------------
  const el = {
    start: document.getElementById('route-start'),
    useLocation: document.getElementById('use-location-route'),
    filterTime: document.getElementById('route-filter-time'),
    filterStatus: document.getElementById('route-filter-status'),
    maxStops: document.getElementById('route-maxstops'),
    maxStopsOut: document.getElementById('route-maxstops-out'),
    eligibleCount: document.getElementById('route-eligible-count'),
    geocodeBtn: document.getElementById('geocode-btn'),
    calcBtn: document.getElementById('calc-route-btn'),
    progress: document.getElementById('route-progress'),
    stats: document.getElementById('route-stats'),
    mapsLink: document.getElementById('route-maps-link'),
    exportBtn: document.getElementById('route-export-btn'),
    droppedWarning: document.getElementById('route-dropped-warning'),
    results: document.getElementById('route-results'),
    stopTemplate: document.getElementById('route-stop-template')
  };

  // Last computed route, kept so the Maps link and Notes export can use it
  // without recomputing. Shape: { orderedLeads, routeStats, startAddress }.
  let lastRoute = null;

  // Idempotency guard: enter() can be called every time the view is shown, but
  // listeners must bind exactly once or clicks fire N times. Bind once, here.
  let wired = false;

  // Don't let two long geocode/calc passes run at once (double-tap, etc.).
  let busy = false;

  // -------------------------------------------------------------------------
  // ELIGIBILITY: which leads are candidates for today's route.
  // A lead is eligible if it has an address, matches the status filter, and is
  // "due" per the selected recency tier (never-visited always counts as due).
  // -------------------------------------------------------------------------
  function getEligibleLeads() {
    const statusFilter = el.filterStatus ? el.filterStatus.value : 'active';
    const tier = el.filterTime ? el.filterTime.value : 'all';
    const minDays = DUE_TIERS[tier] ?? 0;

    return store.getLeads().filter(lead => {
      if (!lead.address || !lead.address.trim()) return false;
      if (statusFilter === 'active' && lead.status !== 'active') return false;
      if (minDays <= 0) return true;
      // getTimeSince returns days=Infinity for never-visited, so they always
      // clear the threshold — exactly what we want (chase the cold ones).
      return getTimeSince(lead.lastVisit).days >= minDays;
    });
  }

  function refreshEligibleCount() {
    if (el.eligibleCount) {
      el.eligibleCount.textContent = String(getEligibleLeads().length);
    }
  }

  // -------------------------------------------------------------------------
  // PROGRESS / RESET helpers
  // -------------------------------------------------------------------------
  function setProgress(message) {
    if (!el.progress) return;
    if (message) {
      el.progress.textContent = message;
      el.progress.hidden = false;
    } else {
      el.progress.textContent = '';
      el.progress.hidden = true;
    }
  }

  // Hide everything that only makes sense once a route exists. Called before a
  // recompute so stale results never linger next to a fresh "Calculating…".
  function clearResults() {
    lastRoute = null;
    if (el.results) el.results.replaceChildren();
    if (el.stats) { el.stats.textContent = ''; el.stats.classList.add('hidden'); }
    if (el.mapsLink) { el.mapsLink.classList.add('hidden'); el.mapsLink.removeAttribute('href'); }
    if (el.exportBtn) el.exportBtn.classList.add('hidden');
    if (el.droppedWarning) { el.droppedWarning.textContent = ''; el.droppedWarning.classList.add('hidden'); }
  }

  // -------------------------------------------------------------------------
  // START ADDRESS: prefer the input box; fall back to the saved config so a
  // returning user doesn't have to retype it every session.
  // -------------------------------------------------------------------------
  function getStartAddress() {
    const typed = el.start ? el.start.value.trim() : '';
    if (typed) return typed;
    const config = readConfig();
    return (config.routeStartAddress || '').trim();
  }

  // -------------------------------------------------------------------------
  // RENDER: stops list + stats. textContent only (clone the template).
  // -------------------------------------------------------------------------
  function renderStats(routeStats, includedStops) {
    if (!el.stats) return;
    const miles = routeStats.totalDistance.toFixed(1);
    // "5 stops · 12.3 mi" — droppedStops handled separately by the warning line.
    el.stats.textContent = `${includedStops} ${includedStops === 1 ? 'stop' : 'stops'} · ${miles} mi`;
    el.stats.classList.remove('hidden');
  }

  function renderStops(orderedLeads) {
    if (!el.results) return;
    el.results.replaceChildren();
    if (!el.stopTemplate) return;

    orderedLeads.forEach((lead, i) => {
      const node = el.stopTemplate.content.firstElementChild.cloneNode(true);

      const num = node.querySelector('[data-field="num"]');
      const name = node.querySelector('[data-field="name"]');
      const addr = node.querySelector('[data-field="address"]');
      const leg = node.querySelector('[data-field="leg"]');

      if (num) num.textContent = String(i + 1);
      if (name) name.textContent = lead.name || 'Unnamed venue';
      if (addr) addr.textContent = lead.address || 'No address';
      if (leg) {
        // The leg distance from the previous stop, plus a flag when the pin is
        // only approximate (geocoder fell back past the exact address).
        const miles = typeof lead.distanceFromPrevious === 'number'
          ? `${lead.distanceFromPrevious} mi from previous`
          : '';
        const approx = lead.coords && lead.coords.approximate ? ' · approx. location' : '';
        leg.textContent = miles + approx;
      }

      el.results.appendChild(node);
    });
  }

  // -------------------------------------------------------------------------
  // GEOCODING: turn addresses into coords, persisting each one back to the
  // store so we never pay the (rate-limited, ~1/sec) Nominatim cost twice.
  // -------------------------------------------------------------------------
  async function geocodeEligible() {
    if (busy) return;
    const config = readConfig();
    const countrycodes = getCountryCodes(config);

    // Work on the eligible set, but only the ones actually missing coords.
    const eligible = getEligibleLeads();
    const needed = eligible.filter(l => !l.coords || typeof l.coords.lat !== 'number' || typeof l.coords.lon !== 'number');

    if (needed.length === 0) {
      setProgress('All eligible leads already have map coordinates.');
      // Auto-clear the transient message so it doesn't sit there forever.
      setTimeout(() => setProgress(''), 2500);
      return;
    }

    busy = true;
    if (el.geocodeBtn) el.geocodeBtn.disabled = true;
    if (el.calcBtn) el.calcBtn.disabled = true;

    try {
      // geocodeLeads mutates the lead objects in place (sets lead.coords) AND
      // reports progress. We hand it our clones, then persist each new coord
      // through the store so the canonical state is updated. Persisting inside
      // the progress callback would be racy, so we re-read .coords after.
      await geocodeLeads(
        needed,
        (current, total, name) => {
          setProgress(`Geocoding ${current}/${total}: ${name}`);
        },
        { countrycodes }
      );

      // Persist whatever got coords. updateLead recomputes derived fields; we
      // only touch coords so nothing else is disturbed.
      let saved = 0;
      for (const lead of needed) {
        if (lead.coords && typeof lead.coords.lat === 'number' && typeof lead.coords.lon === 'number') {
          store.updateLead(lead.id, { coords: lead.coords });
          saved++;
        }
      }

      const failed = needed.length - saved;
      setProgress(
        failed > 0
          ? `Geocoded ${saved} of ${needed.length}. ${failed} couldn't be located — check those addresses.`
          : `Geocoded ${saved} address${saved === 1 ? '' : 'es'}.`
      );
      setTimeout(() => setProgress(''), 4000);
    } catch (err) {
      console.error('Geocoding failed:', err);
      setProgress('Geocoding hit an error — try again in a moment.');
      setTimeout(() => setProgress(''), 4000);
    } finally {
      busy = false;
      if (el.geocodeBtn) el.geocodeBtn.disabled = false;
      if (el.calcBtn) el.calcBtn.disabled = false;
      refreshEligibleCount();
    }
  }

  // -------------------------------------------------------------------------
  // CALCULATE: geocode the start, geocode any missing eligible leads, solve
  // the route, then render + wire the Maps link and Notes export.
  // -------------------------------------------------------------------------
  async function calculateRoute() {
    if (busy) return;

    const startAddress = getStartAddress();
    if (!startAddress) {
      setProgress('Enter a starting address first.');
      if (el.start) el.start.focus();
      setTimeout(() => setProgress(''), 3000);
      return;
    }

    const eligible = getEligibleLeads();
    if (eligible.length === 0) {
      setProgress('No eligible leads to route. Loosen the filters or add addresses.');
      setTimeout(() => setProgress(''), 3500);
      return;
    }

    const config = readConfig();
    const countrycodes = getCountryCodes(config);
    const maxStops = el.maxStops ? parseInt(el.maxStops.value, 10) || 1 : 9;

    busy = true;
    clearResults();
    if (el.geocodeBtn) el.geocodeBtn.disabled = true;
    if (el.calcBtn) el.calcBtn.disabled = true;

    try {
      // 1. Geocode the start point. No start coords -> no route.
      setProgress('Geocoding starting address…');
      const startCoords = await geocodeAddress(startAddress, { countrycodes });
      if (!startCoords) {
        throw new Error('Could not locate the starting address.');
      }

      // 2. Geocode any eligible leads missing coords, persisting as we go.
      const needGeo = eligible.filter(l => !l.coords || typeof l.coords.lat !== 'number' || typeof l.coords.lon !== 'number');
      if (needGeo.length > 0) {
        await geocodeLeads(
          needGeo,
          (current, total, name) => setProgress(`Geocoding ${current}/${total}: ${name}`),
          { countrycodes }
        );
        for (const lead of needGeo) {
          if (lead.coords && typeof lead.coords.lat === 'number' && typeof lead.coords.lon === 'number') {
            store.updateLead(lead.id, { coords: lead.coords });
          }
        }
      }

      // 3. Solve. Only leads that actually have coords can be ordered; the
      //    solver filters the rest out and reports them as skipped.
      setProgress('Calculating the shortest loop…');
      const result = solveRoute(startCoords, eligible, maxStops);
      const { orderedLeads, routeStats } = result;

      if (orderedLeads.length === 0) {
        clearResults();
        setProgress('None of the eligible leads could be mapped. Geocode their addresses first.');
        setTimeout(() => setProgress(''), 4000);
        return;
      }

      // 4. Build the Google Maps directions URL. generateGoogleMapsUrl caps at
      //    the origin + 9 waypoints (Google silently truncates past ~10), and
      //    hands back how many made it in vs. got dropped so we can warn.
      const { url, includedStops, droppedStops } = generateGoogleMapsUrl(startAddress, orderedLeads);

      lastRoute = { orderedLeads, routeStats, startAddress };

      renderStops(orderedLeads);
      renderStats(routeStats, orderedLeads.length);

      if (el.mapsLink) {
        el.mapsLink.href = url;
        el.mapsLink.classList.remove('hidden');
      }
      if (el.exportBtn) el.exportBtn.classList.remove('hidden');

      // Surface Google Maps' cap so the user isn't silently lied to: the link
      // only carries `includedStops`, the rest are still in the notes export.
      if (el.droppedWarning) {
        if (droppedStops > 0) {
          el.droppedWarning.textContent =
            `Google Maps only takes ${includedStops} stops in one link — ${droppedStops} more ${droppedStops === 1 ? 'is' : 'are'} in your route below and in the downloadable notes.`;
          el.droppedWarning.classList.remove('hidden');
        } else {
          el.droppedWarning.textContent = '';
          el.droppedWarning.classList.add('hidden');
        }
      }

      const skipped = routeStats.leadsSkipped || 0;
      setProgress(skipped > 0
        ? `Routed ${orderedLeads.length} stops. ${skipped} lead${skipped === 1 ? '' : 's'} skipped (no coordinates).`
        : '');
      if (skipped > 0) setTimeout(() => setProgress(''), 4000);
    } catch (err) {
      console.error('Route calculation failed:', err);
      setProgress(`Route failed: ${err.message}`);
      setTimeout(() => setProgress(''), 4000);
    } finally {
      busy = false;
      if (el.geocodeBtn) el.geocodeBtn.disabled = false;
      if (el.calcBtn) el.calcBtn.disabled = false;
    }
  }

  // -------------------------------------------------------------------------
  // "Use my location" — fill the start box from the device GPS. Reverse-
  // geocoding isn't needed: route-finder works on coords, but the Maps URL and
  // notes want a human address, so we drop a "lat, lon" string that Google and
  // the solver both accept (the solver geocodes it; Maps reads it as a point).
  // -------------------------------------------------------------------------
  function useMyLocation() {
    if (!navigator.geolocation) {
      setProgress('This device has no location access.');
      setTimeout(() => setProgress(''), 3000);
      return;
    }
    setProgress('Getting your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (el.start) el.start.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setProgress('');
      },
      (err) => {
        console.error('Geolocation failed:', err);
        setProgress('Could not get your location — type an address instead.');
        setTimeout(() => setProgress(''), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  // -------------------------------------------------------------------------
  // NOTES EXPORT: a self-contained, signal-free HTML file you can open on your
  // phone while walking the route. This is the one HTML-string path, so every
  // lead value is escapeHtml()'d. Ported from the old utility.js generator,
  // re-skinned to the brand (green #006937 / gold #ffd700) instead of the old
  // navy. Contacts / visits / scores are always included (no toggles in v2).
  // -------------------------------------------------------------------------
  function exportRouteNotes() {
    if (!lastRoute || !lastRoute.orderedLeads.length) {
      setProgress('Calculate a route first, then download the notes.');
      setTimeout(() => setProgress(''), 3000);
      return;
    }

    const html = generateNotesHTML(lastRoute);
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `route-notes-${date}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Notes export failed:', err);
      setProgress(`Couldn't save the notes: ${err.message}`);
      setTimeout(() => setProgress(''), 3000);
    }
  }

  function generateNotesHTML({ orderedLeads, routeStats, startAddress }) {
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const stopsHTML = orderedLeads.map((lead, i) => {
      const since = getTimeSince(lead.lastVisit).formatted;

      let contactsHTML = '';
      if (lead.contacts && lead.contacts.length > 0) {
        const rows = lead.contacts.map(c => `
          <div class="contact">
            <strong>${escapeHtml(c.name || 'Unknown')}</strong>
            ${c.role ? `<span class="role">${escapeHtml(c.role)}</span>` : ''}
            ${c.phone ? `<a href="tel:${escapeHtml(c.phone)}" class="link">📞 ${escapeHtml(c.phone)}</a>` : ''}
            ${c.email ? `<a href="mailto:${escapeHtml(c.email)}" class="link">✉️ ${escapeHtml(c.email)}</a>` : ''}
          </div>`).join('');
        contactsHTML = `<div class="section"><h4>Contacts</h4>${rows}</div>`;
      }

      let visitsHTML = '';
      if (lead.visits && lead.visits.length > 0) {
        // Newest first, capped at 5 so the sheet stays pocket-sized.
        const recent = [...lead.visits]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);
        const rows = recent.map(v => {
          const vDate = v.date
            ? new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Undated';
          const icon = v.reception === 'warm' ? '🔥' : v.reception === 'cold' ? '❄️' : '🌤️';
          return `
            <div class="visit">
              <div class="visit-head">
                <span class="visit-date">${escapeHtml(vDate)}</span>
                <span class="reception">${icon} ${escapeHtml(v.reception || 'unknown')}</span>
              </div>
              ${v.notes ? `<p class="visit-notes">${escapeHtml(v.notes)}</p>` : ''}
            </div>`;
        }).join('');
        visitsHTML = `<div class="section"><h4>Recent visits</h4>${rows}</div>`;
      }

      let scoresHTML = '';
      if (lead.scores) {
        const { space, traffic, vibes } = lead.scores;
        scoresHTML = `
          <div class="scores">
            <span class="score">🪑 Space ${space ?? '-'}</span>
            <span class="score">👥 Traffic ${traffic ?? '-'}</span>
            <span class="score">✨ Vibes ${vibes ?? '-'}</span>
            <span class="score total">Total ${lead.totalScore ?? '-'}/15</span>
          </div>`;
      }

      let notesHTML = '';
      if (lead.notes && lead.notes.trim()) {
        notesHTML = `<div class="section"><h4>Notes</h4><p class="lead-notes">${escapeHtml(lead.notes)}</p></div>`;
      }

      const leg = typeof lead.distanceFromPrevious === 'number'
        ? `${lead.distanceFromPrevious} mi from previous`
        : '';

      return `
        <div class="stop" id="stop-${i + 1}">
          <div class="stop-head">
            <span class="stop-num">${i + 1}</span>
            <div class="stop-title">
              <h3>${escapeHtml(lead.name || 'Unnamed venue')}</h3>
              ${lead.neighborhood ? `<span class="area">📍 ${escapeHtml(lead.neighborhood)}</span>` : ''}
            </div>
          </div>
          <div class="address">
            <a href="https://maps.google.com/?q=${encodeURIComponent(lead.address || lead.name || '')}" target="_blank" rel="noopener noreferrer">
              🗺️ ${escapeHtml(lead.address || 'No address')}
            </a>
          </div>
          <div class="last-visit">Last visit: ${escapeHtml(since)}</div>
          ${scoresHTML}
          ${notesHTML}
          ${contactsHTML}
          ${visitsHTML}
          ${leg ? `<div class="leg">${escapeHtml(leg)}</div>` : ''}
        </div>`;
    }).join('');

    // Inline <style> here is fine: this is a brand-new standalone document, not
    // the CRM page, so there's no CSP to satisfy and no shared stylesheet to
    // ship with the download. Brand colors so it still looks like us in hand.
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Route Notes — ${escapeHtml(date)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f4f0; color: #1a1a1a; padding: 16px; padding-bottom: 80px; line-height: 1.5;
    }
    header { text-align: center; padding: 20px 16px; background: #006937; color: #fff; border-radius: 12px; margin-bottom: 20px; }
    h1 { font-family: 'Bangers', 'Open Sans', sans-serif; letter-spacing: 1px; color: #ffd700; font-size: 28px; margin-bottom: 4px; }
    .route-date { color: #e8f0eb; font-size: 14px; }
    .summary { display: flex; justify-content: space-around; background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #d8d8d0; }
    .summary-stat { text-align: center; }
    .summary-value { font-size: 28px; font-weight: 700; color: #006937; }
    .summary-label { font-size: 11px; color: #777; text-transform: uppercase; letter-spacing: .5px; }
    .start { background: #fff; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; border-left: 4px solid #ffd700; }
    .start strong { color: #006937; }
    .stop { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #006937; }
    .stop-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .stop-num { width: 36px; height: 36px; background: #006937; color: #fff; font-weight: 700; font-size: 18px; display: flex; align-items: center; justify-content: center; border-radius: 50%; flex-shrink: 0; }
    .stop-title h3 { font-size: 18px; color: #1a1a1a; margin-bottom: 2px; }
    .area { font-size: 13px; color: #777; }
    .address { margin-bottom: 8px; }
    .address a { color: #006937; text-decoration: none; font-size: 14px; font-weight: 600; }
    .last-visit { font-size: 13px; color: #b8860b; margin-bottom: 12px; }
    .scores { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .score { background: #eef2ef; padding: 4px 10px; border-radius: 4px; font-size: 12px; }
    .score.total { background: #ffd700; color: #1a1a1a; font-weight: 700; }
    .section { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e4e4dc; }
    .section h4 { font-size: 13px; color: #006937; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
    .lead-notes { font-size: 14px; color: #333; white-space: pre-wrap; }
    .contact, .visit { background: #f7f7f3; padding: 10px 12px; border-radius: 6px; margin-bottom: 8px; }
    .contact strong { display: block; color: #1a1a1a; margin-bottom: 2px; }
    .contact .role { display: block; font-size: 12px; color: #777; margin-bottom: 6px; }
    .contact .link { display: inline-block; color: #006937; text-decoration: none; font-size: 14px; padding: 4px 8px; background: #eef2ef; border-radius: 4px; margin-right: 8px; margin-top: 4px; }
    .visit-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .visit-date { font-weight: 600; color: #1a1a1a; font-size: 13px; }
    .reception { font-size: 12px; text-transform: capitalize; }
    .visit-notes { font-size: 14px; color: #444; white-space: pre-wrap; }
    .leg { display: inline-block; background: #006937; color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 12px; }
    .quick-nav { position: fixed; bottom: 16px; left: 16px; right: 16px; background: #006937; padding: 12px; border-radius: 12px; display: flex; gap: 8px; overflow-x: auto; z-index: 100; }
    .quick-nav a { flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #fff; color: #006937; text-decoration: none; font-weight: 700; border-radius: 50%; font-size: 14px; }
    .quick-nav a:active { background: #ffd700; }
  </style>
</head>
<body>
  <header>
    <h1>Route Notes</h1>
    <div class="route-date">${escapeHtml(date)}</div>
  </header>
  <div class="summary">
    <div class="summary-stat">
      <div class="summary-value">${orderedLeads.length}</div>
      <div class="summary-label">Stops</div>
    </div>
    <div class="summary-stat">
      <div class="summary-value">${routeStats.totalDistance.toFixed(1)}</div>
      <div class="summary-label">Miles</div>
    </div>
  </div>
  <div class="start"><strong>📍 Starting from:</strong> ${escapeHtml(startAddress)}</div>
  ${stopsHTML}
  <nav class="quick-nav">
    ${orderedLeads.map((_, i) => `<a href="#stop-${i + 1}">${i + 1}</a>`).join('')}
  </nav>
</body>
</html>`;
  }

  // -------------------------------------------------------------------------
  // WIRING: bind every control exactly once. Refreshing the eligible count on
  // every filter change is cheap (it's just a filtered length).
  // -------------------------------------------------------------------------
  function wire() {
    if (wired) return;
    wired = true;

    if (el.filterTime) el.filterTime.addEventListener('change', refreshEligibleCount);
    if (el.filterStatus) el.filterStatus.addEventListener('change', refreshEligibleCount);

    // Max-stops slider: mirror the value into its <output> for accessibility.
    if (el.maxStops && el.maxStopsOut) {
      el.maxStops.addEventListener('input', () => {
        el.maxStopsOut.textContent = el.maxStops.value;
      });
    }

    if (el.geocodeBtn) el.geocodeBtn.addEventListener('click', geocodeEligible);
    if (el.calcBtn) el.calcBtn.addEventListener('click', calculateRoute);
    if (el.useLocation) el.useLocation.addEventListener('click', useMyLocation);
    if (el.exportBtn) el.exportBtn.addEventListener('click', exportRouteNotes);
  }

  // -------------------------------------------------------------------------
  // enter(): called by app.js when the route view is shown. Idempotent.
  // -------------------------------------------------------------------------
  function enter() {
    wire();

    // Prefill the start box from saved config if the user hasn't typed one.
    if (el.start && !el.start.value.trim()) {
      const config = readConfig();
      if (config.routeStartAddress) el.start.value = config.routeStartAddress;
    }

    // Keep the slider's <output> in sync with its current value on entry.
    if (el.maxStops && el.maxStopsOut) el.maxStopsOut.textContent = el.maxStops.value;

    refreshEligibleCount();
  }

  return { enter };
}
