// ============================================
// LEAD-O-TRON 5000 — Google OAuth wiring
// Uses Google Identity Services (GIS) token client.
// ============================================

import { CrmApi } from './crm-api.js';

const CLIENT_ID = '350811251793-a740bu9llt1pf4ecaqfkiapl11entqrm.apps.googleusercontent.com';

const signInBtn    = document.getElementById('driveSignInBtn');
const signOutBtn   = document.getElementById('driveSignOutBtn');
const statusBadge  = document.getElementById('driveStatusBadge');
const demoBanner   = document.getElementById('demo-banner');
const clearDemoBtn = document.getElementById('clearDemoBtn');
const importBannerBtn = document.getElementById('importBtnBanner');

let tokenClient = null;

function updateUI() {
  const connected = CrmApi.driveConnected;
  const isDemo    = CrmApi.isDemoMode();

  signInBtn.classList.toggle('hidden',   connected);
  signOutBtn.classList.toggle('hidden',  !connected);
  statusBadge.classList.toggle('hidden', !connected);

  // Banner visible only while in demo mode and not yet connected
  demoBanner.classList.toggle('hidden', !isDemo || connected);
}

function initGIS() {
  if (typeof google === 'undefined' || !google.accounts) {
    setTimeout(initGIS, 200);
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: async (response) => {
      if (response.error || !response.access_token) {
        console.error('GIS token error:', response.error);
        return;
      }
      CrmApi.cacheToken(response.access_token, response.expires_in);
      await CrmApi.connectDrive(response.access_token);
      updateUI();
      document.dispatchEvent(new Event('crm:drive-connected'));
    }
  });
}

signInBtn.addEventListener('click', () => {
  if (!tokenClient) { console.warn('GIS not ready'); return; }
  tokenClient.requestAccessToken();
});

signOutBtn.addEventListener('click', () => {
  CrmApi.signOut();
  updateUI();
});

clearDemoBtn.addEventListener('click', () => {
  CrmApi.clearDemoData();
  updateUI();
  document.dispatchEvent(new Event('crm:drive-connected')); // reuse reload event
});

// Import from banner triggers the same import handler as the header button
importBannerBtn.addEventListener('click', () => {
  document.getElementById('importBtn').click();
});

document.addEventListener('crm:auth-changed', updateUI);
document.addEventListener('crm:demo-cleared', updateUI);

document.addEventListener('crm:auth-expired', () => {
  updateUI();
  statusBadge.textContent = '☁ Reconnect';
  statusBadge.classList.remove('hidden');
  statusBadge.title = 'Drive session expired — click Sign in to reconnect';
});

// Boot
initGIS();
updateUI();
