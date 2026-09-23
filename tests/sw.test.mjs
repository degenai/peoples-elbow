// Tests for sw.js — Lead-o-Tron's service worker.
// Run: node --test tests/sw.test.mjs
//
// sw.js is a classic (non-module) service-worker script: it talks to `self`,
// `caches`, and `fetch` as ambient globals and registers its three lifecycle
// listeners as a side effect of being evaluated. There is nothing to
// `import` from it. So instead of stubbing out our own reimplementation of
// its logic, we load the REAL file's source text into a fresh Node `vm`
// context per test, wire up a minimal same-origin CacheStorage + fetch, and
// drive its actual registered `install` / `activate` / `fetch` listeners
// directly. Every assertion below is about what the real sw.js does when
// those listeners run — never a parallel implementation of our own.
//
// No hardcoded absolute/private paths: sw.js is located relative to this
// test file only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SW_PATH = path.join(__dirname, '..', 'sw.js');
const SW_SOURCE = fs.readFileSync(SW_PATH, 'utf8');

const ORIGIN = 'https://sw-test.example';

const { VERSION, PRECACHE_URLS } = vm.runInNewContext(
  SW_SOURCE + '\n;({ VERSION, PRECACHE_URLS })',
  { self: { addEventListener() {} } }
);

// --- Minimal same-origin CacheStorage mock ----------------------------------
// Keys by the full resolved same-origin URL (matching real Cache default
// behavior: query strings are significant, `ignoreSearch` is never used by
// sw.js so we don't implement it).

function resolveKey(input) {
  const url = typeof input === 'string' ? input : input.url;
  return new URL(url, ORIGIN + '/').href;
}

class FakeCache {
  constructor(fetchImpl) {
    this.fetchImpl = fetchImpl;
    this.store = new Map();
  }
  async match(request) {
    return this.store.get(resolveKey(request))?.clone();
  }
  async put(request, response) {
    this.store.set(resolveKey(request), response);
  }
  async add(request) {
    const response = await this.fetchImpl(request);
    if (!response?.ok) throw new Error("cache.add: non-ok response");
    await this.put(request, response);
  }
  async addAll(requests) {
    // Real Cache#addAll is atomic: fetch everything first, and only commit
    // if every single response is a healthy, cacheable response. Any one
    // failure means NOTHING from this call is stored.
    const fetched = [];
    for (const req of requests) {
      const res = await this.fetchImpl(req);
      if (!res || !res.ok) {
        throw new Error(`addAll: non-ok response for ${resolveKey(req)}`);
      }
      fetched.push([req, res]);
    }
    for (const [req, res] of fetched) {
      await this.put(req, res);
    }
  }
}

class FakeCacheStorage {
  constructor(fetchImpl) {
    this.fetchImpl = fetchImpl;
    this.map = new Map();
  }
  async open(name) {
    if (!this.map.has(name)) this.map.set(name, new FakeCache(this.fetchImpl));
    return this.map.get(name);
  }
  async keys() {
    return [...this.map.keys()];
  }
  async delete(name) {
    return this.map.delete(name);
  }
}

// --- vm harness --------------------------------------------------------------

function loadSW(fetchImpl) {
  const listeners = {};
  const skipWaitingCalls = [];
  const clientsClaimCalls = [];
  const caches = new FakeCacheStorage((...args) => fetchImpl(...args));

  const sandbox = {
    console,
    fetch: (...args) => fetchImpl(...args),
    caches,
    Request: globalThis.Request,
    Response: globalThis.Response,
    URL: globalThis.URL,
    location: { origin: ORIGIN, href: `${ORIGIN}/sw.js` },
    addEventListener(type, handler) {
      (listeners[type] ||= []).push(handler);
    },
    skipWaiting() {
      skipWaitingCalls.push(true);
    },
    clients: {
      claim() {
        clientsClaimCalls.push(true);
        return Promise.resolve();
      },
    },
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  new vm.Script(SW_SOURCE, { filename: 'sw.js' }).runInContext(sandbox);

  return { listeners, caches, skipWaitingCalls, clientsClaimCalls };
}

function makeInstallEvent() {
  const waitUntilPromises = [];
  return { event: { waitUntil: (p) => waitUntilPromises.push(Promise.resolve(p)) }, waitUntilPromises };
}

function makeFetchEvent(request) {
  let respondWithPromise = null;
  let respondWithCalled = false;
  const waitUntilPromises = [];
  const event = {
    request,
    respondWith(p) {
      respondWithCalled = true;
      respondWithPromise = Promise.resolve(p);
    },
    waitUntil(p) {
      waitUntilPromises.push(Promise.resolve(p));
    },
  };
  return {
    event,
    waitUntilPromises,
    getRespondWithPromise: () => respondWithPromise,
    wasIntercepted: () => respondWithCalled,
  };
}

function req(pathname, { method = 'GET', mode = 'cors', origin = ORIGIN } = {}) {
  // Plain object, not `new Request()`: the Fetch spec forbids constructing a
  // Request with mode: 'navigate' (browsers set that internally on real
  // navigations), so a literal is the only way to simulate one. sw.js only
  // ever reads .url / .method / .mode off this object and hands it straight
  // through to our mocked fetch/cache, so a plain object round-trips fine.
  return { url: `${origin}${pathname}`, method, mode };
}

function ok(body = 'ok', init = {}) {
  return new Response(body, { status: 200, ...init });
}

function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Attaches a settle-tracker without disturbing the original promise's
// consumers, so we can assert "still pending" after a microtask flush.
function trackSettled(promise) {
  const state = { settled: false };
  promise.then(
    () => (state.settled = true),
    () => (state.settled = true)
  );
  return state;
}

async function flush(times = 3) {
  for (let i = 0; i < times; i++) {
    await new Promise((r) => setImmediate(r));
  }
}

// =============================================================================
// 1) networkFirst navigation: cache only healthy replies, never mask live auth
// =============================================================================

test('networkFirst: a healthy 200 navigation response is cached', async () => {
  const fetchImpl = async () => ok('<html>fresh</html>');
  const { listeners, caches } = loadSW(fetchImpl);
  const { event, getRespondWithPromise } = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));

  listeners.fetch[0](event);
  const response = await getRespondWithPromise();
  assert.equal(await response.text(), '<html>fresh</html>');

  const cache = await caches.open(VERSION);
  const cached = await cache.match(req('/crm.html'));
  assert.ok(cached, 'a healthy navigation response should be cached');
});

test('networkFirst: a cached 200 survives a transient live 503 (not overwritten)', async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) return ok('<html>good</html>');
    return new Response('server hiccup', { status: 503 });
  };
  const { listeners, caches } = loadSW(fetchImpl);

  // First navigation: succeeds and caches the good 200.
  const first = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](first.event);
  await first.getRespondWithPromise();

  // Second navigation: network is up but returns a transient 503.
  const second = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](second.event);
  const secondResponse = await second.getRespondWithPromise();
  assert.equal(secondResponse.status, 503, 'the live 503 itself is still returned, not masked');

  // The cache must still hold the earlier good 200, untouched by the 503.
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req('/crm.html'));
  assert.equal(cached.status, 200, 'the 503 must never have overwritten the cached 200');
});

test('networkFirst: a cached 200 survives total network loss', async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) return ok('<html>good</html>');
    throw new TypeError('network loss');
  };
  const { listeners } = loadSW(fetchImpl);

  const first = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](first.event);
  await first.getRespondWithPromise();

  const second = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](second.event);
  const response = await second.getRespondWithPromise();
  assert.equal(await response.text(), '<html>good</html>', 'offline load falls back to the cached 200');
});

test('networkFirst: a live 401 is returned as-is, never masked by a cached 200', async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) return ok('<html>good</html>');
    return new Response('nope', { status: 401 });
  };
  const { listeners } = loadSW(fetchImpl);

  const first = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](first.event);
  await first.getRespondWithPromise();

  const second = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](second.event);
  const response = await second.getRespondWithPromise();
  assert.equal(response.status, 401, 'a live 401 must reach the caller, never a stale cached page');
});

test('networkFirst: offline + unknown public page does NOT get the CRM fallback', async () => {
  const fetchImpl = async () => {
    throw new TypeError('offline');
  };
  const { listeners } = loadSW(fetchImpl);

  const event = makeFetchEvent(req('/steal-this-site.html', { mode: 'navigate' }));
  listeners.fetch[0](event.event);
  const response = await event.getRespondWithPromise();
  // Response.error() is a network-error Response: type 'error', not ok.
  assert.equal(response.type, 'error');
});

test('networkFirst: offline crm.html?foo=bar falls back to the precached bare shell', async () => {
  const fetchImpl = async (request) => {
    const url = typeof request === 'string' ? request : request.url;
    if (url.endsWith('/crm.html')) return ok('<html>shell</html>');
    throw new TypeError('offline');
  };
  const { listeners } = loadSW(fetchImpl);

  // Prime the cache with the bare crm.html shell via a successful navigation.
  const prime = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](prime.event);
  await prime.getRespondWithPromise();

  // Now navigate to a query-param variant while offline.
  const event = makeFetchEvent(req('/crm.html?utm_source=x', { mode: 'navigate' }));
  listeners.fetch[0](event.event);
  const response = await event.getRespondWithPromise();
  assert.equal(await response.text(), '<html>shell</html>');
});

test('fetch handler: cross-origin requests are left completely unintercepted', async () => {
  const fetchImpl = async () => ok();
  const { listeners } = loadSW(fetchImpl);
  const event = makeFetchEvent(req('/token', { origin: 'https://accounts.google.com' }));
  listeners.fetch[0](event.event);
  assert.equal(event.wasIntercepted(), false);
});

test('fetch handler: non-GET requests are left completely unintercepted', async () => {
  const fetchImpl = async () => ok();
  const { listeners } = loadSW(fetchImpl);
  const event = makeFetchEvent(req('/api/leads', { method: 'POST' }));
  listeners.fetch[0](event.event);
  assert.equal(event.wasIntercepted(), false);
});

// =============================================================================
// 2) Atomic install
// =============================================================================

test('install: a fully healthy precache set caches everything, then calls skipWaiting', async () => {
  const fetchImpl = async () => ok('asset');
  const { listeners, caches, skipWaitingCalls } = loadSW(fetchImpl);
  const { event, waitUntilPromises } = makeInstallEvent();

  listeners.install[0](event);
  await Promise.all(waitUntilPromises);

  assert.equal(skipWaitingCalls.length, 1);
  const cache = await caches.open(VERSION);
  for (const url of PRECACHE_URLS) {
    const cached = await cache.match(url);
    assert.ok(cached, `expected ${url} to be precached`);
  }
});

test('install: one essential file failing rejects install atomically, no skipWaiting, no partial cache', async () => {
  const fetchImpl = async (request) => {
    const url = typeof request === 'string' ? request : request.url;
    if (url.includes('js/crm/store.js')) throw new TypeError('404-ish fetch failure');
    return ok('asset');
  };
  const { listeners, caches, skipWaitingCalls } = loadSW(fetchImpl);
  const { event, waitUntilPromises } = makeInstallEvent();

  listeners.install[0](event);
  await assert.rejects(() => Promise.all(waitUntilPromises));

  assert.equal(skipWaitingCalls.length, 0, 'skipWaiting must never be called on a failed install');
  const keys = await caches.keys();
  assert.ok(!keys.includes(VERSION), 'the incomplete new-version cache must be cleaned up');
});

test('install failure never touches a previous healthy lot-v cache', async () => {
  const fetchImpl = async (request) => {
    const url = typeof request === 'string' ? request : request.url;
    if (url.includes('js/crm/store.js')) throw new TypeError('fetch failure');
    return ok('asset');
  };
  const { listeners, caches } = loadSW(fetchImpl);

  // Seed a previous healthy version's cache directly (as if an earlier,
  // successful install/activate already ran).
  const oldCache = await caches.open('lot-v2.0.1');
  await oldCache.put('crm.html', ok('<html>old shell</html>'));

  const { event, waitUntilPromises } = makeInstallEvent();
  listeners.install[0](event);
  await assert.rejects(() => Promise.all(waitUntilPromises));

  const keys = await caches.keys();
  assert.ok(keys.includes('lot-v2.0.1'), 'the previous healthy cache must survive a failed install');
  const stillThere = await oldCache.match('crm.html');
  assert.ok(stillThere, 'the previous healthy cache entry must be untouched');
});

test('failed same-version reinstall retains its already-healthy cache', async () => {
  const { listeners, caches, skipWaitingCalls } = loadSW(async () => { throw new TypeError('offline'); });
  const cache = await caches.open(VERSION);
  await cache.put('crm.html', ok('existing healthy shell'));
  const { event, waitUntilPromises } = makeInstallEvent();
  listeners.install[0](event);
  await assert.rejects(Promise.all(waitUntilPromises));
  assert.ok((await caches.keys()).includes(VERSION));
  assert.equal(await (await cache.match('crm.html')).text(), 'existing healthy shell');
  assert.equal(skipWaitingCalls.length, 0);
});

test('activate: purges only lot-v-prefixed caches other than current, leaves unrelated caches, claims clients', async () => {
  const fetchImpl = async () => ok();
  const { listeners, caches, clientsClaimCalls } = loadSW(fetchImpl);

  await caches.open('lot-v2.0.1'); // stale, owned by us
  await caches.open('lot-v1.9.0'); // stale, owned by us
  await caches.open('some-other-tools-cache'); // not ours
  await caches.open(VERSION); // current

  const { event, waitUntilPromises } = makeInstallEvent(); // shape is identical for activate
  listeners.activate[0](event);
  await Promise.all(waitUntilPromises);

  const keys = await caches.keys();
  assert.ok(!keys.includes('lot-v2.0.1'));
  assert.ok(!keys.includes('lot-v1.9.0'));
  assert.ok(keys.includes('some-other-tools-cache'), 'unrelated cache must survive');
  assert.ok(keys.includes(VERSION), 'current version cache must survive');
  assert.equal(clientsClaimCalls.length, 1);
});

// =============================================================================
// 3) FetchEvent-lifetime-owned background writes (SWR revalidate + put)
// =============================================================================

test('SWR: cache hit responds immediately; waitUntil is registered synchronously', async () => {
  const fetchDeferred = createDeferred();
  const fetchImpl = () => fetchDeferred.promise;
  const { listeners, caches } = loadSW(fetchImpl);

  const cache = await caches.open(VERSION);
  await cache.put('js/main.js', ok('cached-version'));

  const { event, waitUntilPromises, getRespondWithPromise } = makeFetchEvent(req('/js/main.js'));
  listeners.fetch[0](event);

  // waitUntil must already have been registered — synchronously, in this
  // same call — even though the network hasn't resolved yet.
  assert.equal(waitUntilPromises.length, 1, 'waitUntil must be registered synchronously during the fetch handler');

  const response = await getRespondWithPromise();
  assert.equal(await response.text(), 'cached-version', 'cache hit responds instantly, not waiting on network');

  fetchDeferred.resolve(ok('network-version'));
  await waitUntilPromises[0];
  const updated = await cache.match('js/main.js');
  assert.equal(await updated.clone().text(), 'network-version', 'background revalidate updates the cache after respond');
});

test('SWR lifetime: waitUntil stays pending until BOTH the network fetch and the cache.put settle', async () => {
  const fetchDeferred = createDeferred();
  const fetchImpl = () => fetchDeferred.promise;
  const { listeners, caches } = loadSW(fetchImpl);

  const cache = await caches.open(VERSION);
  await cache.put('js/main.js', ok('cached-version'));

  const putDeferred = createDeferred();
  const originalPut = cache.put.bind(cache);
  let putCalled = false;
  cache.put = (request, response) => {
    putCalled = true;
    return putDeferred.promise.then(() => originalPut(request, response));
  };

  const { event, waitUntilPromises } = makeFetchEvent(req('/js/main.js'));
  listeners.fetch[0](event);
  const settled = trackSettled(waitUntilPromises[0]);

  await flush();
  assert.equal(settled.settled, false, 'must still be pending before the network even resolves');

  fetchDeferred.resolve(ok('network-version'));
  await flush();
  assert.equal(putCalled, true, 'cache.put should have been invoked once the network resolved');
  assert.equal(settled.settled, false, 'must still be pending while cache.put is gated');

  putDeferred.resolve();
  await flush();
  assert.equal(settled.settled, true, 'resolves only once both network and put have settled');
});

test('SWR: a cache.put rejection (quota) does not become an unhandled rejection and keeps the response valid', async () => {
  const fetchImpl = async () => ok('network-version');
  const { listeners, caches } = loadSW(fetchImpl);

  const cache = await caches.open(VERSION);
  await cache.put('js/main.js', ok('cached-version'));
  cache.put = async () => {
    throw new Error('QuotaExceededError');
  };

  const { event, waitUntilPromises, getRespondWithPromise } = makeFetchEvent(req('/js/main.js'));
  listeners.fetch[0](event);

  const response = await getRespondWithPromise();
  assert.equal(await response.text(), 'cached-version', 'immediate response is unaffected by a later put failure');

  // Must not reject — a rejected waitUntil promise means the background
  // work "threw away" the network response instead of tolerating the
  // cache-write failure.
  await assert.doesNotReject(() => waitUntilPromises[0]);
});

test('SWR: cache miss awaits the network and returns it', async () => {
  const fetchImpl = async () => ok('network-only');
  const { listeners, caches } = loadSW(fetchImpl);

  const { event, getRespondWithPromise } = makeFetchEvent(req('/js/new-file.js'));
  listeners.fetch[0](event);
  const response = await getRespondWithPromise();
  assert.equal(await response.text(), 'network-only');

  const cache = await caches.open(VERSION);
  const cached = await cache.match('js/new-file.js');
  assert.ok(cached, 'the network response should now be cached for next time');
});

test('SWR: cache miss + network rejection resolves to a network-error Response, not a hang or throw', async () => {
  const fetchImpl = async () => {
    throw new TypeError('offline');
  };
  const { listeners } = loadSW(fetchImpl);

  const { event, getRespondWithPromise } = makeFetchEvent(req('/js/unreachable.js'));
  listeners.fetch[0](event);
  const response = await getRespondWithPromise();
  assert.equal(response.type, 'error');
});

test('networkFirst lifetime: respondWith stays pending until BOTH fetch and cache.put settle', async () => {
  const fetchDeferred = createDeferred();
  const fetchImpl = () => fetchDeferred.promise;
  const { listeners, caches } = loadSW(fetchImpl);

  const cache = await caches.open(VERSION);
  const putDeferred = createDeferred();
  const originalPut = cache.put.bind(cache);
  cache.put = (request, response) => putDeferred.promise.then(() => originalPut(request, response));

  const { event, getRespondWithPromise } = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](event);
  const settled = trackSettled(getRespondWithPromise());

  await flush();
  assert.equal(settled.settled, false, 'must still be pending before the network resolves');

  fetchDeferred.resolve(ok('<html>fresh</html>'));
  await flush();
  assert.equal(settled.settled, false, 'must still be pending while cache.put is gated');

  putDeferred.resolve();
  await flush();
  assert.equal(settled.settled, true, 'resolves only once both network and put have settled');
});

test('networkFirst: a cache.put rejection (quota) does not discard the live network response', async () => {
  const fetchImpl = async () => ok('<html>fresh</html>');
  const { listeners, caches } = loadSW(fetchImpl);

  const cache = await caches.open(VERSION);
  cache.put = async () => {
    throw new Error('QuotaExceededError');
  };

  const { event, getRespondWithPromise } = makeFetchEvent(req('/crm.html', { mode: 'navigate' }));
  listeners.fetch[0](event);

  const response = await getRespondWithPromise();
  assert.equal(await response.text(), '<html>fresh</html>', 'live response still wins despite a failed cache write');
});

// =============================================================================
// R2-P4-F4: comment nit — clients.claim is immediate, doesn't reload page code
// =============================================================================

test('SWR preserves cached data on network rejection and live data on quota rejection', async () => {
  const offline = loadSW(async () => { throw new TypeError('offline'); });
  await (await offline.caches.open(VERSION)).put('js/main.js',ok('cached'));
  const hit = makeFetchEvent(req('/js/main.js'));
  offline.listeners.fetch[0](hit.event);
  assert.equal(await (await hit.getRespondWithPromise()).text(),'cached');
  await Promise.all(hit.waitUntilPromises);
  const quota = loadSW(async () => ok('fresh'));
  (await quota.caches.open(VERSION)).put = async () => { throw new Error('synthetic quota'); };
  const miss = makeFetchEvent(req('/js/main.js'));
  quota.listeners.fetch[0](miss.event);
  assert.equal(await (await miss.getRespondWithPromise()).text(),'fresh');
  await Promise.all(miss.waitUntilPromises);
});

test('live 403 does not return a stale cached navigation', async () => {
  const {listeners,caches} = loadSW(async () => new Response('denied',{status:403}));
  await (await caches.open(VERSION)).put('crm.html',ok('old'));
  const event = makeFetchEvent(req('/crm.html',{mode:'navigate'}));
  listeners.fetch[0](event.event);
  assert.equal((await event.getRespondWithPromise()).status,403);
});

test('precache covers the actual local CRM import graph', () => {
  const visited = new Set();
  const visit = relative => {
    if (visited.has(relative)) return;
    visited.add(relative);
    assert.ok(PRECACHE_URLS.includes(relative),relative+' must be precached');
    const source = fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*\()\s*['"](\.[^'"]+)['"]/g)) {
      visit(path.posix.normalize(path.posix.join(path.posix.dirname(relative),match[1])));
    }
  };
  visit('js/crm/app.js');
});

test('comment nit: activate no longer implies clients.claim reloads/hot-swaps existing page code', () => {
  const activateBlock = SW_SOURCE.slice(SW_SOURCE.indexOf("addEventListener('activate'"));
  assert.match(
    activateBlock,
    /does NOT[\s\S]{0,40}reload the tab/i,
    'activate comment should clarify clients.claim does not reload or hot-swap already-loaded page code'
  );
});
