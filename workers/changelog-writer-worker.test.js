import test from 'node:test';
import assert from 'node:assert';
import worker from './changelog-writer-worker.js';

// The writer now requires a Bearer token (fail closed). Tests supply a matching
// CHANGELOG_WRITE_TOKEN in env and send the header; one test omits it to prove
// the gate. The worker no longer leaks internal error detail to callers.
const TOKEN = 'test-token';

function createPostRequest(body, { auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = `Bearer ${TOKEN}`;
    return new Request('http://localhost/', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

function dbEnv(run) {
    return {
        CHANGELOG_WRITE_TOKEN: TOKEN,
        CHANGELOG_DB: {
            prepare: () => ({ bind: (...args) => ({ run: async () => run(args) }) }),
        },
    };
}

test('changelog-writer-worker: reject non-POST requests', async () => {
    const request = new Request('http://localhost/', { method: 'GET' });
    const response = await worker.fetch(request, {}, {});
    assert.strictEqual(response.status, 405);
    assert.strictEqual(await response.text(), 'Expected POST request');
});

test('changelog-writer-worker: reject POST with no/invalid token', async () => {
    const request = createPostRequest({ commit_hash: 'a', commit_message: 'm', commit_date: 'd', author_name: 'n' }, { auth: false });
    const response = await worker.fetch(request, dbEnv(() => ({ success: true })), {});
    assert.strictEqual(response.status, 401);
    const data = await response.json();
    assert.strictEqual(data.success, false);
});

test('changelog-writer-worker: reject when worker has no token configured (fail closed)', async () => {
    const request = createPostRequest({ commit_hash: 'a', commit_message: 'm', commit_date: 'd', author_name: 'n' });
    // env without CHANGELOG_WRITE_TOKEN — even a "valid" header can't match an unset secret.
    const response = await worker.fetch(request, { CHANGELOG_DB: {} }, {});
    assert.strictEqual(response.status, 401);
});

test('changelog-writer-worker: reject missing required fields', async () => {
    const body = { commit_message: 'msg', commit_date: '2023-01-01', author_name: 'test' };
    const response = await worker.fetch(createPostRequest(body), dbEnv(() => ({ success: true })), {});
    assert.strictEqual(response.status, 400);
    assert.strictEqual(await response.text(), 'Missing required field: commit_hash');
});

test('changelog-writer-worker: successfully add entry', async () => {
    let bindArgs = null;
    const env = dbEnv((args) => { bindArgs = args; return { success: true }; });
    const body = {
        commit_hash: 'abcdef123',
        commit_message: 'Update features',
        commit_date: '2023-01-01T12:00:00Z',
        author_name: 'Jane Doe',
        author_email: 'jane@example.com',
    };
    const response = await worker.fetch(createPostRequest(body), env, {});
    assert.strictEqual(response.status, 201);
    assert.strictEqual((await response.json()).success, true);
    assert.deepStrictEqual(bindArgs, ['abcdef123', 'Update features', '2023-01-01T12:00:00Z', 'Jane Doe', 'jane@example.com']);
});

test('changelog-writer-worker: handle UNIQUE constraint violation (duplicate)', async () => {
    const env = dbEnv(() => { throw new Error('D1_ERROR: UNIQUE constraint failed: changelog_entries.commit_hash'); });
    const body = { commit_hash: 'abcdef123', commit_message: 'Duplicate', commit_date: '2023-01-01T12:00:00Z', author_name: 'Jane Doe' };

    const originalConsoleError = console.error;
    console.error = () => {};
    const response = await worker.fetch(createPostRequest(body), env, {});
    console.error = originalConsoleError;

    assert.strictEqual(response.status, 409);
    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Error: Commit hash already exists.');
});

test('changelog-writer-worker: generic DB error does not leak internals', async () => {
    const env = dbEnv(() => { throw new Error('Database connection failed'); });
    const body = { commit_hash: 'abcdef123', commit_message: 'Some feature', commit_date: '2023-01-01T12:00:00Z', author_name: 'Jane Doe' };

    const originalConsoleError = console.error;
    console.error = () => {};
    const response = await worker.fetch(createPostRequest(body), env, {});
    console.error = originalConsoleError;

    assert.strictEqual(response.status, 500);
    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Failed to add changelog entry.');
    assert.strictEqual(data.error, undefined); // internal detail must NOT be exposed
});
