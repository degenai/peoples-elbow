import test from 'node:test';
import assert from 'node:assert';
import worker from './host-form-worker.js';

test('host-form-worker: handleHostForm valid submission', async () => {
  const formData = new FormData();
  formData.append('venue-name', 'Test Venue');
  formData.append('contact-name', 'Test Contact');
  formData.append('contact-email', 'test@example.com');
  formData.append('venue-type', 'Studio');
  formData.append('message', 'Test message');

  const request = new Request('http://localhost/', {
    method: 'POST',
    body: formData
  });

  let runCalled = false;
  let bindCalled = false;
  let prepareCalled = false;
  let emailSent = false;

  const env = {
    FORMS_DB: {
      prepare: (query) => {
        // Handle the initial check query
        if (query.includes('sqlite_master')) {
          return { all: async () => [] };
        }

        prepareCalled = true;
        assert.ok(query.includes('INSERT INTO host_submissions'));
        return {
          bind: (...args) => {
            bindCalled = true;
            assert.strictEqual(args.length, 6); // 5 fields + created_at
            assert.strictEqual(args[0], 'Test Venue');
            return {
              run: async () => {
                runCalled = true;
                return { success: true };
              }
            };
          }
        };
      }
    },
    MAIL: {
      send: async (message) => {
        emailSent = true;
        assert.strictEqual(message.to, 'peoples.elbow.massage@gmail.com');
        assert.ok(message.rawEmail.includes('Test Venue'));
        return true;
      }
    }
  };

  const ctx = {};

  const response = await worker.fetch(request, env, ctx);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.success, true);

  assert.ok(prepareCalled);
  assert.ok(bindCalled);
  assert.ok(runCalled);
  assert.ok(emailSent);
});

test('host-form-worker: handleHostForm missing required fields', async () => {
  const formData = new FormData();
  formData.append('venue-name', 'Test Venue');
  // Missing other required fields

  const request = new Request('http://localhost/', {
    method: 'POST',
    body: formData
  });

  const env = {};
  const ctx = {};

  const response = await worker.fetch(request, env, ctx);
  assert.strictEqual(response.status, 400);
  const data = await response.json();
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.message, 'Please fill in all required fields');
});

test('host-form-worker: handleContactForm valid submission', async () => {
  const formData = new FormData();
  formData.append('name', 'Test Contact');
  formData.append('email', 'test@example.com');
  formData.append('contact-message', 'Test message');

  const request = new Request('http://localhost/', {
    method: 'POST',
    body: formData
  });

  let runCalled = false;
  let bindCalled = false;
  let prepareCalled = false;
  let emailSent = false;

  const env = {
    FORMS_DB: {
      prepare: (query) => {
        // Handle the initial check query
        if (query.includes('sqlite_master')) {
          return { all: async () => [] };
        }

        prepareCalled = true;
        assert.ok(query.includes('INSERT INTO contact_submissions'));
        return {
          bind: (...args) => {
            bindCalled = true;
            assert.strictEqual(args.length, 4); // 3 fields + created_at
            return {
              run: async () => {
                runCalled = true;
                return { success: true };
              }
            };
          }
        };
      }
    },
    MAIL: {
      send: async (message) => {
        emailSent = true;
        assert.strictEqual(message.to, 'peoples.elbow.massage@gmail.com');
        assert.ok(message.rawEmail.includes('Test Contact'));
        return true;
      }
    }
  };

  const ctx = {};

  const response = await worker.fetch(request, env, ctx);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.success, true);

  assert.ok(prepareCalled);
  assert.ok(bindCalled);
  assert.ok(runCalled);
  assert.ok(emailSent);
});

test('host-form-worker: reject non-POST request', async () => {
  const request = new Request('http://localhost/', { method: 'GET' });
  const response = await worker.fetch(request, {}, {});
  assert.strictEqual(response.status, 405);
});

test('host-form-worker: OPTIONS request (CORS preflight)', async () => {
  const request = new Request('http://localhost/', { method: 'OPTIONS' });
  const response = await worker.fetch(request, {}, {});
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
});
