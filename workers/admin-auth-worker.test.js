import test from 'node:test';
import assert from 'node:assert';
import worker from './admin-auth-worker.js';

test('admin-auth-worker: reject POST without password', async () => {
    const request = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'login' }) // missing password
    });

    const env = { ADMIN_PASSWORD: 'test_password' };
    const ctx = { waitUntil: () => {} };

    const response = await worker.fetch(request, env, ctx);
    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.success, false);
});

test('admin-auth-worker: accept correct password', async () => {
    const request = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'login', password: 'correct_password' })
    });

    const env = { ADMIN_PASSWORD: 'correct_password' };
    const ctx = { waitUntil: () => {} };

    const response = await worker.fetch(request, env, ctx);
    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
});

test('admin-auth-worker: reject incorrect password', async () => {
    const request = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'login', password: 'wrong_password' })
    });

    const env = { ADMIN_PASSWORD: 'correct_password' };
    const ctx = { waitUntil: () => {} };

    const response = await worker.fetch(request, env, ctx);
    assert.strictEqual(response.status, 401);
});

test('admin-auth-worker: verify valid token', async () => {
    // Generate valid token locally
    const tokenStr = 'correct_password_authenticated_token_salt_xyz';
    const msgBuffer = new TextEncoder().encode(tokenStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const request = new Request('http://localhost/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'verify', token: token })
    });

    const env = { ADMIN_PASSWORD: 'correct_password' };
    const ctx = { waitUntil: () => {} };

    const response = await worker.fetch(request, env, ctx);
    assert.strictEqual(response.status, 200);
});

test('admin-auth-worker: reject invalid token', async () => {
    const request = new Request('http://localhost/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'verify', token: 'invalid_token_123' })
    });

    const env = { ADMIN_PASSWORD: 'correct_password' };
    const ctx = { waitUntil: () => {} };

    const response = await worker.fetch(request, env, ctx);
    assert.strictEqual(response.status, 401);
});
