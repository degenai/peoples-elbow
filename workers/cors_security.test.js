import test from 'node:test';
import assert from 'node:assert';
import changelogReader from './changelog-reader-worker.js';
import hostFormWorker from './host-form-worker.js';

// Mock env and ctx
const env = {
  CHANGELOG_DB: {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [] })
      }),
      all: async () => ({ results: [{ total: 0 }] })
    })
  },
  FORMS_DB: {
    prepare: () => ({
      all: async () => [],
      run: async () => {}
    })
  },
  MAIL: {
    send: async () => {}
  }
};
const ctx = {
  waitUntil: () => {}
};

const ALLOWED_ORIGINS = [
  'https://peoples-elbow.com',
  'https://degenai.github.io'
];

test('Changelog Reader Worker CORS headers', async (t) => {
  await t.test('Whitelisted origin returns origin and Vary header', async () => {
    const origin = ALLOWED_ORIGINS[0];
    const request = new Request('https://example.com', {
      method: 'GET',
      headers: { 'Origin': origin }
    });

    const response = await changelogReader.fetch(request, env, ctx);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.strictEqual(response.headers.get('Vary'), 'Origin');
  });

  await t.test('Non-whitelisted origin returns default whitelisted origin and Vary header', async () => {
    const origin = 'https://evil.com';
    const request = new Request('https://example.com', {
      method: 'GET',
      headers: { 'Origin': origin }
    });

    const response = await changelogReader.fetch(request, env, ctx);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGINS[0]);
    assert.strictEqual(response.headers.get('Vary'), 'Origin');
  });

  await t.test('No origin returns default whitelisted origin and Vary header', async () => {
    const request = new Request('https://example.com', {
      method: 'GET'
    });

    const response = await changelogReader.fetch(request, env, ctx);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGINS[0]);
    assert.strictEqual(response.headers.get('Vary'), 'Origin');
  });

  await t.test('OPTIONS preflight returns correct headers', async () => {
    const origin = ALLOWED_ORIGINS[1];
    const request = new Request('https://example.com', {
      method: 'OPTIONS',
      headers: { 'Origin': origin }
    });

    const response = await changelogReader.fetch(request, env, ctx);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.strictEqual(response.headers.get('Vary'), 'Origin');
  });
});

test('Host Form Worker CORS headers', async (t) => {
  await t.test('Whitelisted origin returns origin and Vary header (OPTIONS)', async () => {
    const origin = ALLOWED_ORIGINS[1];
    const request = new Request('https://example.com', {
      method: 'OPTIONS',
      headers: { 'Origin': origin }
    });

    const response = await hostFormWorker.fetch(request, env, ctx);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.strictEqual(response.headers.get('Vary'), 'Origin');
  });

  await t.test('Non-whitelisted origin returns default whitelisted origin (OPTIONS)', async () => {
    const origin = 'https://malicious.com';
    const request = new Request('https://example.com', {
      method: 'OPTIONS',
      headers: { 'Origin': origin }
    });

    const response = await hostFormWorker.fetch(request, env, ctx);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGINS[0]);
    assert.strictEqual(response.headers.get('Vary'), 'Origin');
  });

  await t.test('Error response includes correct CORS headers', async () => {
    const origin = ALLOWED_ORIGINS[0];
    const request = new Request('https://example.com', {
      method: 'GET', // Method not allowed
      headers: { 'Origin': origin }
    });

    const response = await hostFormWorker.fetch(request, env, ctx);
    assert.strictEqual(response.status, 405);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.strictEqual(response.headers.get('Vary'), 'Origin');
  });
});
