import { register } from 'node:module';
register('./test-loader.js', import.meta.url);

import test from 'node:test';
import assert from 'node:assert';

test('host-form-worker: handleContactForm success path', async () => {
    const worker = await import('./host-form-worker.js');

    // Create FormData with required fields for contact form
    const formData = new FormData();
    formData.append('name', 'Test User');
    formData.append('email', 'test@example.com');
    formData.append('contact-message', 'This is a test message');

    const request = new Request('http://localhost/', {
        method: 'POST',
        body: formData
    });

    let d1QueryRun = false;
    let emailSent = false;

    const env = {
        FORMS_DB: {
            prepare: (query) => {
                if (query.includes('SELECT name FROM sqlite_master')) {
                    return { all: async () => [{name: 'contact_submissions'}] };
                }
                assert.ok(query.includes('INSERT INTO contact_submissions'));
                return {
                    bind: (...values) => {
                        assert.ok(values.includes('Test User'));
                        assert.ok(values.includes('test@example.com'));
                        assert.ok(values.includes('This is a test message'));
                        return {
                            run: async () => { d1QueryRun = true; }
                        };
                    }
                };
            }
        },
        MAIL: {
            send: async (message) => {
                assert.strictEqual(message.to, 'peoples.elbow.massage@gmail.com');
                assert.ok(message.raw.includes('Subject: New Contact Form Message from Test User'));
                emailSent = true;
            }
        }
    };

    const ctx = {};
    const response = await worker.default.fetch(request, env, ctx);

    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.strictEqual(data.success, true);

    assert.ok(d1QueryRun, 'D1 query should have been run');
    assert.ok(emailSent, 'Email should have been sent');
});

test('host-form-worker: handleContactForm missing required fields', async () => {
    const worker = await import('./host-form-worker.js');

    const formData = new FormData();
    formData.append('name', 'Test User');
    // Missing email

    const request = new Request('http://localhost/', {
        method: 'POST',
        body: formData
    });

    const env = {};
    const ctx = {};

    const response = await worker.default.fetch(request, env, ctx);

    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Please fill in all required fields');
});

test('host-form-worker: handleContactForm fallback message', async () => {
    const worker = await import('./host-form-worker.js');

    const formData = new FormData();
    formData.append('name', 'Test User');
    formData.append('email', 'test@example.com');
    // Missing contact-message

    const request = new Request('http://localhost/', {
        method: 'POST',
        body: formData
    });

    let emailSent = false;
    const env = {
        FORMS_DB: {
            prepare: (query) => {
                if (query.includes('SELECT name FROM sqlite_master')) {
                    return { all: async () => [{name: 'contact_submissions'}] };
                }
                return {
                    bind: (...values) => {
                        assert.ok(values.includes('No message provided'));
                        return { run: async () => {} };
                    }
                };
            }
        },
        MAIL: {
            send: async (message) => {
                assert.ok(message.raw.includes('No message provided'));
                emailSent = true;
            }
        }
    };

    const ctx = {};
    const response = await worker.default.fetch(request, env, ctx);

    assert.strictEqual(response.status, 200);
    assert.ok(emailSent);
});

test('host-form-worker: handleHostForm success path', async () => {
    const worker = await import('./host-form-worker.js');

    // Create FormData with required fields for host form
    const formData = new FormData();
    formData.append('venue-name', 'The Cool Venue');
    formData.append('contact-name', 'Venue Manager');
    formData.append('contact-email', 'venue@example.com');
    formData.append('venue-type', 'Cafe');
    formData.append('message', 'We would love to host!');

    const request = new Request('http://localhost/', {
        method: 'POST',
        body: formData
    });

    let d1QueryRun = false;
    let emailSent = false;

    const env = {
        FORMS_DB: {
            prepare: (query) => {
                if (query.includes('SELECT name FROM sqlite_master')) {
                    return { all: async () => [{name: 'host_submissions'}] };
                }
                assert.ok(query.includes('INSERT INTO host_submissions'));
                return {
                    bind: (...values) => {
                        assert.ok(values.includes('The Cool Venue'));
                        assert.ok(values.includes('Venue Manager'));
                        assert.ok(values.includes('venue@example.com'));
                        assert.ok(values.includes('Cafe'));
                        assert.ok(values.includes('We would love to host!'));
                        return {
                            run: async () => { d1QueryRun = true; }
                        };
                    }
                };
            }
        },
        MAIL: {
            send: async (message) => {
                assert.strictEqual(message.to, 'peoples.elbow.massage@gmail.com');
                assert.ok(message.raw.includes('Subject: New Host Request: The Cool Venue'));
                emailSent = true;
            }
        }
    };

    const ctx = {};
    const response = await worker.default.fetch(request, env, ctx);

    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.strictEqual(data.success, true);

    assert.ok(d1QueryRun, 'D1 query should have been run');
    assert.ok(emailSent, 'Email should have been sent');
});

test('host-form-worker: handleHostForm missing required fields', async () => {
    const worker = await import('./host-form-worker.js');

    const formData = new FormData();
    formData.append('venue-name', 'The Cool Venue');
    // Missing other fields

    const request = new Request('http://localhost/', {
        method: 'POST',
        body: formData
    });

    const env = {};
    const ctx = {};

    const response = await worker.default.fetch(request, env, ctx);

    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Please fill in all required fields');
});

test('host-form-worker: CORS preflight requests', async () => {
    const worker = await import('./host-form-worker.js');
    const request = new Request('http://localhost/', {
        method: 'OPTIONS'
    });
    const env = {};
    const ctx = {};

    const response = await worker.default.fetch(request, env, ctx);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
});

test('host-form-worker: Reject non-POST requests', async () => {
    const worker = await import('./host-form-worker.js');
    const request = new Request('http://localhost/', {
        method: 'GET'
    });
    const env = {};
    const ctx = {};

    const response = await worker.default.fetch(request, env, ctx);
    assert.strictEqual(response.status, 405);
});
