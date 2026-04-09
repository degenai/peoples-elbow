// Utility Belt Renderer with anime.js v4
// anime.js is loaded via script tag as window.anime object
// v4 API: anime(), anime.stagger(), anime.set(), etc.

// Verify anime.js is loaded
if (typeof anime === 'undefined') {
  console.error('anime.js not loaded! Check cdn import');
  // Create no-op fallback that won't break the app
  window.anime = Object.assign(
    (config) => ({
      pause: () => {},
      play: () => {},
      finished: Promise.resolve()
    }),
    {
      stagger: (val, opts) => 0,
      set: (targets, props) => {
        // Actually set the final values so elements are visible
        const els = typeof targets === 'string' ? document.querySelectorAll(targets) :
                    targets instanceof NodeList ? targets :
                    targets ? [targets] : [];
        els.forEach(el => {
          if (!el) return;
          if (props.opacity !== undefined) el.style.opacity = props.opacity;
          if (props.scale !== undefined || props.translateX !== undefined || props.translateY !== undefined) {
            el.style.transform = 'none';
          }
        });
      },
      timeline: () => ({ add: () => ({}) })
    }
  );
}

import { CrmApi } from './crm-api.js';
import { solveRoute, generateGoogleMapsUrl } from './route-finder.js';
import { geocodeAddress } from './geocoding.js';

// ============================================
// ANIME.JS HELPERS
// Wrapper functions for common animation patterns
// ============================================

/**
 * Animate a counter from one value to another
 * Uses anime.js update callback for smooth number transitions
 */
function animateCounter(element, targetValue, options = {}) {
  const startValue = options.startValue || 0;
  const decimals = options.decimals !== undefined ? options.decimals : 1;
  const suffix = options.suffix || '';
  const duration = options.duration || 1500;

  const counter = { value: startValue };

  return anime({ targets: counter,
    value: targetValue,
    duration: duration,
    ease: 'outExpo',
    onUpdate: () => {
      if (decimals === 0) {
        element.textContent = Math.round(counter.value) + suffix;
      } else {
        element.textContent = counter.value.toFixed(decimals) + suffix;
      }
    }
  });
}

/**
 * Create a looping pulse animation
 * Returns animation instance with pause/play controls
 */
function createPulseAnimation(element, options = {}) {
  const duration = options.duration || 800;

  return anime({ targets: element,
    scale: [1, 1.2],
    opacity: [1, 0.7],
    duration: duration / 2,
    ease: 'inOutSine',
    alternate: true,
    loop: true
  });
}

// ============================================
// STATE
// ============================================

let state = {
  config: {},
  eligibleLeads: [],
  routeResults: null,
  isCalculating: false,
  pulseAnimation: null
};

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
  backBtn: document.getElementById('backBtn'),
  startAddress: document.getElementById('startAddress'),
  followUpDays: document.getElementById('followUpDays'),
  statusFilter: document.getElementById('statusFilter'),
  eligibleCount: document.getElementById('eligibleCount'),
  maxStops: document.getElementById('maxStops'),
  maxStopsValue: document.getElementById('maxStopsValue'),
  calculateBtn: document.getElementById('calculateBtn'),
  progressSection: document.getElementById('progressSection'),
  progressText: document.getElementById('progressText'),
  progressFill: document.getElementById('progressFill'),
  resultsSection: document.getElementById('resultsSection'),
  totalDistance: document.getElementById('totalDistance'),
  stopCount: document.getElementById('stopCount'),
  routeList: document.getElementById('routeList'),
  openMapsBtn: document.getElementById('openMapsBtn'),
  exportNotesBtn: document.getElementById('exportNotesBtn'),
  // Export card elements
  includeContacts: document.getElementById('includeContacts'),
  includeVisitHistory: document.getElementById('includeVisitHistory'),
  includeScores: document.getElementById('includeScores'),
  exportStatus: document.getElementById('exportStatus'),
  exportRouteNotesBtn: document.getElementById('exportRouteNotesBtn')
};

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  // Run entrance animations
  await runEntranceAnimations();

  // Load config
  await loadConfig();

  // Load initial candidates
  await refreshCandidates();

  // Setup event listeners
  setupEventListeners();
}

async function runEntranceAnimations() {
  const header = document.querySelector('.utility-header');
  const cards = document.querySelectorAll('.tool-card');

  // Header slide in using anime.js v4
  await anime({ targets: header,
    opacity: [0, 1],
    translateY: [-20, 0],
    duration: 400,
    ease: 'outQuad'
  }).finished;

  // Tool cards stagger reveal using anime.js v4
  anime({ targets: cards,
    opacity: [0, 1],
    translateY: [40, 0],
    scale: [0.9, 1],
    duration: 500,
    delay: anime.stagger(120, { start: 100 }),
    ease: 'outBack'
  });
}

async function loadConfig() {
  try {
    state.config = await CrmApi.getConfig();

    // Prefill starting address from config
    if (state.config.routeStartAddress) {
      elements.startAddress.value = state.config.routeStartAddress;
    }

    // Set follow-up days from config
    if (state.config.followUpDays) {
      elements.followUpDays.value = state.config.followUpDays.toString();
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Back button
  elements.backBtn.addEventListener('click', () => {
    window.location.href = 'crm.html';
  });

  // Back button hover animation using anime.js v4
  elements.backBtn.addEventListener('mouseenter', () => {
    anime({ targets: elements.backBtn,
      scale: 1.1,
      duration: 200,
      ease: 'outQuad'
    });
  });
  elements.backBtn.addEventListener('mouseleave', () => {
    anime({ targets: elements.backBtn,
      scale: 1,
      duration: 200,
      ease: 'outQuad'
    });
  });

  // Filter changes - refresh candidates
  elements.followUpDays.addEventListener('change', refreshCandidates);
  elements.statusFilter.addEventListener('change', refreshCandidates);

  // Slider value display with anime.js v4 pop effect
  elements.maxStops.addEventListener('input', () => {
    const value = elements.maxStops.value;
    elements.maxStopsValue.textContent = value;

    // Animate the value change with anime.js v4
    anime({ targets: elements.maxStopsValue,
      scale: [1.3, 1],
      duration: 200,
      ease: 'outBack'
    });
  });

  // Calculate button
  elements.calculateBtn.addEventListener('click', calculateRoute);

  // Calculate button hover with anime.js v4
  elements.calculateBtn.addEventListener('mouseenter', () => {
    if (!state.isCalculating) {
      anime({ targets: elements.calculateBtn,
        scale: 1.02,
        duration: 150,
        ease: 'outQuad'
      });
    }
  });
  elements.calculateBtn.addEventListener('mouseleave', () => {
    anime({ targets: elements.calculateBtn,
      scale: 1,
      duration: 150,
      ease: 'outQuad'
    });
  });

  // Open Maps button
  elements.openMapsBtn.addEventListener('click', openInGoogleMaps);

  // Export Notes buttons (both inline and card)
  elements.exportNotesBtn.addEventListener('click', exportRouteNotes);
  elements.exportRouteNotesBtn.addEventListener('click', exportRouteNotes);

  // Save start address on blur
  elements.startAddress.addEventListener('blur', async () => {
    const address = elements.startAddress.value.trim();
    if (address && address !== state.config.routeStartAddress) {
      state.config.routeStartAddress = address;
      await CrmApi.saveConfig(state.config);
    }
  });
}

// ============================================
// DATA LOADING
// ============================================

async function refreshCandidates() {
  try {
    const options = {
      followUpDays: parseInt(elements.followUpDays.value),
      statusFilter: elements.statusFilter.value
    };

    const data = await CrmApi.getLeads();
    // In case of API failure, data might not have a leads array
    if (!data || !data.leads) {
      state.eligibleLeads = [];
    } else {
      const now = Date.now();
      const followUpDays = options.followUpDays || 14;
      const statusFilter = options.statusFilter || 'active';

      state.eligibleLeads = data.leads.filter(lead => {
        if (statusFilter === 'active' && lead.status !== 'active') return false;
        if (!lead.address || !lead.address.trim()) return false;
        if (followUpDays > 0) {
          if (!lead.lastVisit) return true;
          const daysSinceVisit = Math.floor((now - new Date(lead.lastVisit).getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceVisit >= followUpDays;
        }
        return true;
      });
    }

    // Animate count update with anime.js
    const oldCount = parseInt(elements.eligibleCount.textContent) || 0;
    const newCount = state.eligibleLeads.length;

    if (oldCount !== newCount) {
      animateCounter(elements.eligibleCount, newCount, {
        startValue: oldCount,
        duration: 600,
        decimals: 0
      });
    }

    // Update slider max
    elements.maxStops.max = Math.max(1, Math.min(15, newCount));
    if (parseInt(elements.maxStops.value) > newCount) {
      elements.maxStops.value = Math.min(5, newCount);
      elements.maxStopsValue.textContent = elements.maxStops.value;
    }

  } catch (error) {
    console.error('Failed to refresh candidates:', error);
  }
}

// ============================================
// ROUTE CALCULATION
// ============================================

async function calculateRoute() {
  if (state.isCalculating) return;

  const startAddress = elements.startAddress.value.trim();
  if (!startAddress) {
    alert('Please enter a starting address');
    elements.startAddress.focus();
    return;
  }

  if (state.eligibleLeads.length === 0) {
    alert('No eligible leads to visit');
    return;
  }

  state.isCalculating = true;

  // Update button state with anime.js v4
  elements.calculateBtn.disabled = true;
  elements.calculateBtn.textContent = '🔄 Calculating...';
  anime({ targets: elements.calculateBtn,
    opacity: 0.7,
    duration: 200,
    ease: 'outQuad'
  });

  // Show progress section
  elements.progressSection.classList.add('visible');
  elements.resultsSection.classList.remove('visible');

  // Start pulsing indicator with anime.js
  const indicator = document.querySelector('.calc-indicator');
  state.pulseAnimation = createPulseAnimation(indicator);

  try {
    // Geocode start address first
    updateProgress(0, 1, 'Geocoding starting address...');
    const startCoords = await geocodeAddress(startAddress);

    if (!startCoords) {
      throw new Error('Could not geocode starting address');
    }

    // Calculate route
    updateProgress(0, 1, 'Calculating optimal route...');

    const options = {
      startAddress,
      startCoords,
      maxStops: parseInt(elements.maxStops.value),
      followUpDays: parseInt(elements.followUpDays.value),
      statusFilter: elements.statusFilter.value
    };

    // Internal calculateRoute implementation replacing window.utilityBeltAPI.calculateRoute
    const maxStops = options.maxStops;

    // Geocode any leads without coords
    const leadsNeedingGeocode = state.eligibleLeads.filter(lead =>
      !lead.coords || !lead.coords.lat || !lead.coords.lon
    );

    if (leadsNeedingGeocode.length > 0) {
      let geocoded = 0;
      const batchUpdates = [];

      for (const lead of leadsNeedingGeocode) {
        geocoded++;
        updateProgress(geocoded, leadsNeedingGeocode.length, `Geocoding ${lead.name}... (${geocoded}/${leadsNeedingGeocode.length})`);

        const coords = await geocodeAddress(lead.address);
        if (coords) {
          lead.coords = coords;
          batchUpdates.push({ id: lead.id, data: { coords } });
        }
      }

      if (batchUpdates.length > 0) {
        await CrmApi.updateLeads(batchUpdates);
      }
    }

    state.routeResults = solveRoute(startCoords, state.eligibleLeads, maxStops);

    // Hide progress - pause anime.js animation
    if (state.pulseAnimation) {
      state.pulseAnimation.pause();
      // Reset the indicator scale/opacity
      anime.set(indicator, { scale: 1, opacity: 1 });
    }
    elements.progressSection.classList.remove('visible');

    // Show results with animations
    await displayResults();

  } catch (error) {
    console.error('Route calculation failed:', error);
    alert('Route calculation failed: ' + error.message);

    if (state.pulseAnimation) {
      state.pulseAnimation.pause();
      anime.set(indicator, { scale: 1, opacity: 1 });
    }
    elements.progressSection.classList.remove('visible');

  } finally {
    state.isCalculating = false;
    elements.calculateBtn.disabled = false;
    elements.calculateBtn.textContent = '🧮 Calculate Optimal Route';
    anime({ targets: elements.calculateBtn,
      opacity: 1,
      duration: 200,
      ease: 'outQuad'
    });
  }
}

function updateProgress(current, total, message) {
  elements.progressText.textContent = message || `Processing ${current} of ${total}...`;

  const progress = total > 0 ? current / total : 0;
  // Animate progress bar with anime.js v4
  anime({ targets: elements.progressFill,
    scaleX: progress,
    duration: 300,
    ease: 'outQuad'
  });
}

// ============================================
// RESULTS DISPLAY
// ============================================

async function displayResults() {
  if (!state.routeResults) return;

  const { orderedLeads, routeStats } = state.routeResults;

  // Show results section
  elements.resultsSection.classList.add('visible');

  // Animate stats with anime.js counter
  animateCounter(elements.totalDistance, routeStats.totalDistance, {
    duration: 1200,
    decimals: 1
  });

  animateCounter(elements.stopCount, orderedLeads.length, {
    duration: 800,
    decimals: 0
  });

  // Clear previous results
  elements.routeList.innerHTML = '';

  // Create route stop elements
  orderedLeads.forEach((lead, i) => {
    const stopEl = createRouteStopElement(lead, i);
    elements.routeList.appendChild(stopEl);
  });

  // Animate route stops staggered reveal using anime.js v4
  const stops = elements.routeList.querySelectorAll('.route-stop');
  anime({ targets: stops,
    opacity: [0, 1],
    translateX: [-30, 0],
    duration: 400,
    delay: anime.stagger(80),
    ease: 'outQuad'
  });

  // Animate distance badges with bounce using anime.js v4
  const badges = elements.routeList.querySelectorAll('.distance-badge');
  anime({ targets: badges,
    scale: [0, 1],
    duration: 400,
    delay: anime.stagger(60, { start: 300 }),
    ease: 'outBack'
  });

  // Animate maps button glow effect using anime.js v4
  setTimeout(() => {
    anime({ targets: elements.openMapsBtn,
      boxShadow: [
        '0 4px 16px rgba(66, 133, 244, 0.3)',
        '0 4px 24px rgba(66, 133, 244, 0.6)',
        '0 4px 16px rgba(66, 133, 244, 0.3)'
      ],
      duration: 2000,
      ease: 'inOutSine',
      loop: true
    });
  }, orderedLeads.length * 80 + 500);

  // Update export status
  updateExportStatus();
}

function createRouteStopElement(lead, index) {
  const div = document.createElement('div');
  div.className = 'route-stop';
  div.dataset.leadId = lead.id;

  const daysSinceVisit = lead.lastVisit
    ? Math.floor((Date.now() - new Date(lead.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
    : 'Never';

  div.innerHTML = `
    <div class="stop-number">${index + 1}</div>
    <div class="stop-info">
      <div class="stop-name">${escapeHtml(lead.name)}</div>
      <div class="stop-address">${escapeHtml(lead.address || 'No address')}</div>
      <div class="stop-meta">
        <span>Last visit: ${daysSinceVisit === 'Never' ? 'Never' : daysSinceVisit + ' days ago'}</span>
        ${lead.neighborhood ? `<span>📍 ${escapeHtml(lead.neighborhood)}</span>` : ''}
      </div>
    </div>
    ${!lead.coords ? '<span class="geocode-warning" title="Could not geocode address">⚠️</span>' : ''}
    <div class="distance-badge">${lead.distanceFromPrevious || 0} mi</div>
  `;

  // Click to select with anime.js
  div.addEventListener('click', () => {
    document.querySelectorAll('.route-stop').forEach(s => s.classList.remove('selected'));
    div.classList.add('selected');

    // Animate selection with anime.js v4
    anime({ targets: div,
      boxShadow: ['0 0 0 rgba(255,199,44,0)', '0 0 20px rgba(255,199,44,0.4)'],
      duration: 300,
      ease: 'outQuad'
    });
  });

  return div;
}

// ============================================
// UPDATE EXPORT STATUS
// ============================================

function updateExportStatus() {
  if (state.routeResults && state.routeResults.orderedLeads.length > 0) {
    elements.exportStatus.classList.add('ready');
    elements.exportStatus.innerHTML = `
      <span class="status-icon">✅</span>
      <span class="status-text">Ready to export ${state.routeResults.orderedLeads.length} stops</span>
    `;
    elements.exportRouteNotesBtn.disabled = false;
  } else {
    elements.exportStatus.classList.remove('ready');
    elements.exportStatus.innerHTML = `
      <span class="status-icon">ℹ️</span>
      <span class="status-text">Calculate a route first to export notes</span>
    `;
    elements.exportRouteNotesBtn.disabled = true;
  }
}

// ============================================
// ROUTE NOTES EXPORT
// ============================================

async function exportRouteNotes() {
  if (!state.routeResults || !state.routeResults.orderedLeads.length) {
    alert('No route to export. Calculate a route first!');
    return;
  }

  const options = {
    includeContacts: elements.includeContacts.checked,
    includeVisitHistory: elements.includeVisitHistory.checked,
    includeScores: elements.includeScores.checked
  };

  const html = generateMobileHTML(state.routeResults, options);

  try {
    const dataBlob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `route-notes-${date}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    const result = { success: true };

    if (result.success) {
      // Show success feedback
      const btn = elements.exportRouteNotesBtn;
      const originalText = btn.textContent;
      btn.textContent = '✅ Exported!';
      btn.style.background = 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 2000);
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export notes: ' + error.message);
  }
}

function generateMobileHTML(routeResults, options) {
  const { orderedLeads, routeStats } = routeResults;
  const startAddress = elements.startAddress.value.trim();
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let stopsHTML = orderedLeads.map((lead, i) => {
    const daysSinceVisit = lead.lastVisit
      ? Math.floor((Date.now() - new Date(lead.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Contacts section
    let contactsHTML = '';
    if (options.includeContacts && lead.contacts && lead.contacts.length > 0) {
      const contactsList = lead.contacts.map(c => `
        <div class="contact">
          <strong>${escapeHtml(c.name || 'Unknown')}</strong>
          ${c.role ? `<span class="role">${escapeHtml(c.role)}</span>` : ''}
          ${c.phone ? `<a href="tel:${c.phone}" class="phone">📞 ${escapeHtml(c.phone)}</a>` : ''}
          ${c.email ? `<a href="mailto:${c.email}" class="email">✉️ ${escapeHtml(c.email)}</a>` : ''}
        </div>
      `).join('');
      contactsHTML = `<div class="contacts-section"><h4>📇 Contacts</h4>${contactsList}</div>`;
    }

    // Visit history section
    let visitsHTML = '';
    if (options.includeVisitHistory && lead.visits && lead.visits.length > 0) {
      const visitsList = lead.visits.slice(0, 5).map(v => {
        const visitDate = new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const receptionIcon = v.reception === 'warm' ? '🔥' : v.reception === 'cold' ? '🧊' : '😐';
        return `
          <div class="visit">
            <div class="visit-header">
              <span class="visit-date">${visitDate}</span>
              <span class="reception">${receptionIcon} ${v.reception || 'unknown'}</span>
            </div>
            ${v.notes ? `<p class="visit-notes">${escapeHtml(v.notes)}</p>` : ''}
          </div>
        `;
      }).join('');
      visitsHTML = `<div class="visits-section"><h4>📋 Recent Visits</h4>${visitsList}</div>`;
    }

    // Scores section
    let scoresHTML = '';
    if (options.includeScores && lead.scores) {
      const { space, traffic, vibes } = lead.scores;
      scoresHTML = `
        <div class="scores-section">
          <span class="score">📐 Space: ${space || '-'}</span>
          <span class="score">🚶 Traffic: ${traffic || '-'}</span>
          <span class="score">✨ Vibes: ${vibes || '-'}</span>
          <span class="score total">Total: ${lead.totalScore || '-'}</span>
        </div>
      `;
    }

    return `
      <div class="stop" id="stop-${i + 1}">
        <div class="stop-header">
          <span class="stop-number">${i + 1}</span>
          <div class="stop-title">
            <h3>${escapeHtml(lead.name)}</h3>
            ${lead.neighborhood ? `<span class="neighborhood">📍 ${escapeHtml(lead.neighborhood)}</span>` : ''}
          </div>
        </div>

        <div class="address">
          <a href="https://maps.google.com/?q=${encodeURIComponent(lead.address || lead.name)}" target="_blank">
            🗺️ ${escapeHtml(lead.address || 'No address')}
          </a>
        </div>

        ${daysSinceVisit !== null ? `<div class="last-visit">Last visited ${daysSinceVisit} days ago</div>` : '<div class="last-visit">Never visited</div>'}

        ${scoresHTML}
        ${contactsHTML}
        ${visitsHTML}

        <div class="distance-badge">${lead.distanceFromPrevious || 0} mi from previous</div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>Route Notes - ${date}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #1a1a2e;
      color: #e0e0e0;
      padding: 16px;
      padding-bottom: 80px;
      line-height: 1.5;
    }

    header {
      text-align: center;
      padding: 20px 16px;
      background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid #ffc72c;
    }

    h1 {
      color: #ffc72c;
      font-size: 24px;
      margin-bottom: 8px;
    }

    .route-date {
      color: #888;
      font-size: 14px;
    }

    .route-summary {
      display: flex;
      justify-content: space-around;
      background: #16213e;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .summary-stat {
      text-align: center;
    }

    .summary-value {
      font-size: 28px;
      font-weight: 700;
      color: #ffc72c;
    }

    .summary-label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
    }

    .start-location {
      background: #2d3a5a;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .start-location strong {
      color: #ffc72c;
    }

    .stop {
      background: #16213e;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      border-left: 4px solid #00a878;
    }

    .stop-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .stop-number {
      width: 36px;
      height: 36px;
      background: #00a878;
      color: #fff;
      font-weight: 700;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .stop-title h3 {
      font-size: 18px;
      color: #fff;
      margin-bottom: 4px;
    }

    .neighborhood {
      font-size: 13px;
      color: #888;
    }

    .address {
      margin-bottom: 8px;
    }

    .address a {
      color: #4dabf7;
      text-decoration: none;
      font-size: 14px;
    }

    .last-visit {
      font-size: 13px;
      color: #f39c12;
      margin-bottom: 12px;
    }

    .scores-section {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .score {
      background: #2d3a5a;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
    }

    .score.total {
      background: #ffc72c;
      color: #1a1a2e;
      font-weight: 700;
    }

    .contacts-section, .visits-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #2d3a5a;
    }

    .contacts-section h4, .visits-section h4 {
      font-size: 14px;
      color: #ffc72c;
      margin-bottom: 8px;
    }

    .contact {
      background: #2d3a5a;
      padding: 10px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .contact strong {
      display: block;
      color: #fff;
      margin-bottom: 4px;
    }

    .contact .role {
      display: block;
      font-size: 12px;
      color: #888;
      margin-bottom: 6px;
    }

    .contact a {
      display: inline-block;
      color: #4dabf7;
      text-decoration: none;
      font-size: 14px;
      padding: 4px 8px;
      background: rgba(77, 171, 247, 0.1);
      border-radius: 4px;
      margin-right: 8px;
      margin-top: 4px;
    }

    .visit {
      background: #2d3a5a;
      padding: 10px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .visit-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .visit-date {
      font-weight: 600;
      color: #fff;
      font-size: 13px;
    }

    .reception {
      font-size: 12px;
      text-transform: capitalize;
    }

    .visit-notes {
      font-size: 14px;
      color: #ccc;
      white-space: pre-wrap;
    }

    .distance-badge {
      display: inline-block;
      background: #00a878;
      color: #fff;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 12px;
    }

    /* Quick Nav */
    .quick-nav {
      position: fixed;
      bottom: 16px;
      left: 16px;
      right: 16px;
      background: #16213e;
      padding: 12px;
      border-radius: 12px;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      border: 1px solid #ffc72c;
      z-index: 100;
    }

    .quick-nav a {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #2d3a5a;
      color: #ffc72c;
      text-decoration: none;
      font-weight: 700;
      border-radius: 50%;
      font-size: 14px;
    }

    .quick-nav a:active {
      background: #ffc72c;
      color: #1a1a2e;
    }
  </style>
</head>
<body>
  <header>
    <h1>🚗 Route Notes</h1>
    <div class="route-date">${date}</div>
  </header>

  <div class="route-summary">
    <div class="summary-stat">
      <div class="summary-value">${orderedLeads.length}</div>
      <div class="summary-label">Stops</div>
    </div>
    <div class="summary-stat">
      <div class="summary-value">${routeStats.totalDistance.toFixed(1)}</div>
      <div class="summary-label">Miles</div>
    </div>
  </div>

  <div class="start-location">
    <strong>📍 Starting from:</strong> ${escapeHtml(startAddress)}
  </div>

  ${stopsHTML}

  <nav class="quick-nav">
    ${orderedLeads.map((_, i) => `<a href="#stop-${i + 1}">${i + 1}</a>`).join('')}
  </nav>
</body>
</html>`;
}

// ============================================
// GOOGLE MAPS EXPORT
// ============================================

function openInGoogleMaps() {
  if (!state.routeResults || !state.routeResults.orderedLeads.length) {
    alert('No route to open');
    return;
  }

  const startAddress = elements.startAddress.value.trim();
  const stops = [startAddress];

  state.routeResults.orderedLeads.forEach(lead => {
    if (lead.address) {
      stops.push(lead.address);
    }
  });

  const encodedStops = stops.map(addr => encodeURIComponent(addr));
  const url = `https://www.google.com/maps/dir/${encodedStops.join('/')}`;

  window.open(url, '_blank');
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// CSS keyframes replaced by anime.js animations

// ============================================
// START
// ============================================

init().catch(err => {
  console.error('Utility Belt initialization failed:', err);
  const errorContainer = document.createElement('div');
  errorContainer.style.color = 'red';
  errorContainer.style.padding = '20px';

  const errorHeading = document.createElement('h2');
  errorHeading.textContent = 'Error loading Utility Belt';

  const errorPre = document.createElement('pre');
  errorPre.textContent = `${err.message}\n${err.stack}`;

  errorContainer.appendChild(errorHeading);
  errorContainer.appendChild(errorPre);

  document.body.innerHTML = '';
  document.body.appendChild(errorContainer);
});
