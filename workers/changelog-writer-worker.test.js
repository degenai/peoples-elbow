import test from 'node:test';
import assert from 'node:assert';
import worker from './changelog-writer-worker.js';

// Setup basic request and environment for testing
function createPostRequest(body) {
    return new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

test('changelog-writer-worker: reject non-POST requests', async () => {
    const request = new Request('http://localhost/', { method: 'GET' });
    const response = await worker.fetch(request, {}, {});
    assert.strictEqual(response.status, 405);
    const text = await response.text();
    assert.strictEqual(text, 'Expected POST request');
});

test('changelog-writer-worker: reject missing required fields', async () => {
    // Missing commit_hash
    const body = {
        commit_message: 'msg',
        commit_date: '2023-01-01',
        author_name: 'test'
    };
    const request = createPostRequest(body);
    const response = await worker.fetch(request, {}, {});
    assert.strictEqual(response.status, 400);
    const text = await response.text();
    assert.strictEqual(text, 'Missing required field: commit_hash');
});

test('changelog-writer-worker: successfully add entry', async () => {
    const body = {
        commit_hash: 'abcdef123',
        commit_message: 'Update features',
        commit_date: '2023-01-01T12:00:00Z',
        author_name: 'Jane Doe',
        author_email: 'jane@example.com'
    };
    const request = createPostRequest(body);

    // Mock D1 DB binding
    let bindArgs = null;
    const env = {
        CHANGELOG_DB: {
            prepare: (query) => {
                return {
                    bind: (...args) => {
                        bindArgs = args;
                        return {
                            run: async () => ({ success: true })
                        };
                    }
                };
            }
        }
    };

    const response = await worker.fetch(request, env, {});
    assert.strictEqual(response.status, 201);
    const data = await response.json();
    assert.strictEqual(data.success, true);
    assert.deepStrictEqual(bindArgs, [
        'abcdef123',
        'Update features',
        '2023-01-01T12:00:00Z',
        'Jane Doe',
        'jane@example.com'
    ]);
});

test('changelog-writer-worker: handle UNIQUE constraint violation (duplicate)', async () => {
    const body = {
        commit_hash: 'abcdef123',
        commit_message: 'Duplicate feature',
        commit_date: '2023-01-01T12:00:00Z',
        author_name: 'Jane Doe'
    };
    const request = createPostRequest(body);

    // Mock D1 DB binding to throw UNIQUE constraint error
    const env = {
        CHANGELOG_DB: {
            prepare: (query) => {
                return {
                    bind: (...args) => {
                        return {
                            run: async () => {
                                throw new Error('D1_ERROR: UNIQUE constraint failed: changelog_entries.commit_hash');
                            }
                        };
                    }
                };
            }
        }
    };

    // Suppress console.error during expected failure
    const originalConsoleError = console.error;
    let loggedError = null;
    console.error = (msg, e) => { loggedError = e; };

    const response = await worker.fetch(request, env, {});

    console.error = originalConsoleError; // restore

    assert.strictEqual(response.status, 409);
    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Error: Commit hash already exists.');
    assert.ok(loggedError);
});

test('changelog-writer-worker: handle generic database error', async () => {
    const body = {
        commit_hash: 'abcdef123',
        commit_message: 'Some feature',
        commit_date: '2023-01-01T12:00:00Z',
        author_name: 'Jane Doe'
    };
    const request = createPostRequest(body);

    // Mock D1 DB binding to throw generic error
    const env = {
        CHANGELOG_DB: {
            prepare: (query) => {
                return {
                    bind: (...args) => {
                        return {
                            run: async () => {
                                throw new Error('Database connection failed');
                            }
                        };
                    }
                };
            }
        }
    };

    // Suppress console.error during expected failure
    const originalConsoleError = console.error;
    let loggedError = null;
    console.error = (msg, e) => { loggedError = e; };

    const response = await worker.fetch(request, env, {});

    console.error = originalConsoleError; // restore

    assert.strictEqual(response.status, 500);
    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Failed to add changelog entry.');
    assert.strictEqual(data.error, 'Database connection failed');
    assert.ok(loggedError);
});
