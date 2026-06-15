/*
 * Lead-o-Tron v2 — Service Worker
 * ================================
 * This file is the reason the CRM works with no signal in a card-shop
 * basement or a farmers-market field. A service worker is a little script
 * the browser keeps running in the background, between you and the network.
 * It can answer "give me crm.html" out of a local cache instead of waiting
 * on bars you don't have.
 *
 * No Workbox, no build step, no framework. Just the raw Cache + Fetch APIs
 * so you can read every line and fork it. Steal this site.
 *
 * Mental model of the three lifecycle events below:
 *   install  -> grab a copy of every file the app shell needs ("precache")
 *   activate -> throw away caches from older versions, take control of tabs
 *   fetch    -> decide, per request, whether to answer from cache or network
 */

// Asset updates normally land on their own: same-origin JS/CSS use
// stale-while-revalidate below, so a changed file is refreshed on the load after
// it ships (users are at most one load behind), and navigations are network-first
// so crm.html is never stale online. Bump this VERSION to FORCE an immediate full
// purge of the old cache on activate (e.g. for a breaking app-shell change).
const VERSION = 'lot-v2.0.2';
const CACHE_NAME = VERSION; // one cache per version keeps cleanup trivial.

// The app shell: everything the CRM needs to boot offline. We add each file
// individually and tolerate a miss (see the install handler) rather than failing
// the whole batch if a path is ever renamed. The js/crm/* list must match app.js's
// static import graph, or a cold offline first-load will fail to resolve a module.
const PRECACHE_URLS = [
  'crm.html',
  'css/main.css',
  'css/crm.css',
  'manifest.webmanifest',
  'js/components.js',
  'js/main.js',
  'js/vendor/anime.esm.min.js',
  'components/header.html',
  'components/footer.html',
  'images/favicon-32.png',
  'images/logo.png',
  // The CRM engine, plain ES modules. Keep in sync with app.js's imports.
  'js/crm/app.js',
  'js/crm/store.js',
  'js/crm/sync.js',
  'js/crm/auth.js',
  'js/crm/drive.js',
  'js/crm/render.js',
  'js/crm/motion.js',
  'js/crm/route.js',
  'js/crm/route-finder.js',
  'js/crm/geocoding.js',
  'js/crm/demo-data.js',
  'js/crm/constants.js',
  'js/crm/utils.js',
  'js/crm/data-normalizer.js',
  'js/crm/email-lead-parser.js',
];

// --- INSTALL: precache the app shell ---------------------------------------
self.addEventListener('install', (event) => {
  // skipWaiting() means a freshly installed worker doesn't sit in "waiting"
  // behind the old one — it activates as soon as it's ready. Paired with
  // clients.claim() in activate, an update takes effect on next load.
  self.skipWaiting();

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // We deliberately do NOT use cache.addAll(): addAll is all-or-nothing, so a
    // single missing/renamed file would reject the whole install and the app
    // would never go offline-capable. Instead we add each URL on its own and use
    // allSettled, which never rejects — present files get cached, misses skipped.
    const results = await Promise.allSettled(
      PRECACHE_URLS.map((url) => cache.add(url))
    );
    // Surface the misses in the console so a dev knows what didn't precache.
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn('[sw] precache skipped (not found yet?):', PRECACHE_URLS[i]);
      }
    });
  })());
});

// --- ACTIVATE: clean up old versions ---------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete every cache that isn't the current version. We match on the
    // 'lot-v' prefix so we only ever clean up our own caches, never some
    // other tool's that might share this origin.
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('lot-v') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    // Take control of any already-open tabs right now, instead of waiting
    // for them to be closed and reopened.
    await self.clients.claim();
  })());
});

// --- FETCH: decide how to answer each request ------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only ever touch GET. POST/PUT to Drive etc. must hit the network raw.
  if (request.method !== 'GET') return;

  // HANDS OFF cross-origin. Google sign-in, the Drive/Sheets APIs, and the
  // Nominatim geocoder all do their own auth, CORS, and caching — if we
  // intercept them we'll break OAuth redirects and CORS preflights. By simply
  // returning (not calling respondWith), the browser handles these normally.
  // This guard also covers accounts.google.com and *.googleapis.com because
  // they are, by definition, a different origin than peoples-elbow.com.
  if (url.origin !== self.location.origin) return;

  // From here down everything is same-origin.

  // Navigations (the user opening/refreshing the app) get network-first so an
  // online user always sees the latest crm.html, but we fall back to the
  // cached copy the instant the network fails — that's the "opens with no
  // signal" promise.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else same-origin (CSS, JS modules, images): cache-first with a
  // background revalidate ("stale-while-revalidate"). The page paints instantly
  // from cache; meanwhile we quietly fetch a fresh copy for next time.
  event.respondWith(staleWhileRevalidate(request));
});

// Network-first: try the network, fall back to cache, then to a cached
// crm.html as a last resort so a cold offline launch still shows the app.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    // Stash a copy so the next offline launch has the newest shell.
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // This worker is root-scoped (it governs the whole site), so only fall back
    // to the CRM shell for the CRM itself — never serve crm.html in place of the
    // homepage or another page when offline. Other pages get the browser's own
    // offline page (Response.error()). The query-param case for crm.html (which
    // we didn't cache verbatim) still lands on the bare precached shell.
    const path = new URL(request.url).pathname;
    if (path === '/crm.html' || path.endsWith('/crm.html')) {
      return (await cache.match('crm.html')) || Response.error();
    }
    return Response.error();
  }
}

// Stale-while-revalidate: answer from cache immediately if we have it, and
// kick off a network refresh in the background regardless. If we have no
// cached copy, we await the network instead.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      // Only cache real, complete responses. Opaque/error responses get
      // skipped so we never poison the cache with a broken file.
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined); // offline: swallow so cached copy can win.

  // Cached copy first (fast), otherwise wait on the network.
  return cached || (await networkFetch) || Response.error();
}
