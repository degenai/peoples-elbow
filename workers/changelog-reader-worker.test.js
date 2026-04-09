import test from 'node:test';
import assert from 'node:assert';
import worker from './changelog-reader-worker.js';

// Suppress console.error in tests for expected errors
const originalConsoleError = console.error;
console.error = () => {};

// Helper to create a mock D1 database binding
const createMockD1 = (results = [], totalCount = 0, shouldFail = false) => {
    return {
        prepare: (query) => {
            const statement = {
                bind: (...args) => statement,
                all: async () => {
                    if (shouldFail) throw new Error('Database error');
                    if (query.includes('COUNT(*)')) {
                        return { results: [{ total: totalCount }] };
                    }
                    return { results };
                }
            };
            return statement;
        }
    };
};

test('changelog-reader-worker: handles OPTIONS request', async () => {
    const request = new Request('http://localhost/', { method: 'OPTIONS' });
    const response = await worker.fetch(request, {}, {});

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), '*');
});

test('changelog-reader-worker: rejects POST request', async () => {
    const request = new Request('http://localhost/', { method: 'POST' });
    const response = await worker.fetch(request, {}, {});

    assert.strictEqual(response.status, 405);
    const data = await response.json();
    assert.strictEqual(data.error, 'Expected GET request');
});

test('changelog-reader-worker: default pagination parameters (limit 50, offset 0)', async () => {
    const request = new Request('http://localhost/', { method: 'GET' });
    const env = { CHANGELOG_DB: createMockD1([], 10) };

    const response = await worker.fetch(request, env, {});
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.pagination.limit, 50);
    assert.strictEqual(data.pagination.offset, 0);
    assert.strictEqual(data.pagination.total, 10);
    assert.strictEqual(data.pagination.hasMore, false);
});

test('changelog-reader-worker: rejects limit > 100', async () => {
    const request = new Request('http://localhost/?limit=101', { method: 'GET' });
    const response = await worker.fetch(request, {}, {});

    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.error, 'Limit cannot exceed 100');
});

test('changelog-reader-worker: accepts exact limit 100', async () => {
    const request = new Request('http://localhost/?limit=100', { method: 'GET' });
    const env = { CHANGELOG_DB: createMockD1([], 150) };

    const response = await worker.fetch(request, env, {});
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.pagination.limit, 100);
    assert.strictEqual(data.pagination.hasMore, true);
});

test('changelog-reader-worker: hasMore is true when records remain', async () => {
    const request = new Request('http://localhost/?limit=10&offset=5', { method: 'GET' });
    const env = { CHANGELOG_DB: createMockD1([], 20) };

    const response = await worker.fetch(request, env, {});
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.pagination.limit, 10);
    assert.strictEqual(data.pagination.offset, 5);
    assert.strictEqual(data.pagination.total, 20);
    assert.strictEqual(data.pagination.hasMore, true);
});

test('changelog-reader-worker: hasMore is false at end of records', async () => {
    const request = new Request('http://localhost/?limit=10&offset=15', { method: 'GET' });
    const env = { CHANGELOG_DB: createMockD1([], 20) };

    const response = await worker.fetch(request, env, {});
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.pagination.hasMore, false); // 15 + 10 = 25 >= 20
});

test('changelog-reader-worker: hasMore is false when exact match', async () => {
    const request = new Request('http://localhost/?limit=10&offset=10', { method: 'GET' });
    const env = { CHANGELOG_DB: createMockD1([], 20) };

    const response = await worker.fetch(request, env, {});
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.pagination.hasMore, false); // 10 + 10 = 20 >= 20
});

test('changelog-reader-worker: handles invalid number formats gracefully (fallback to defaults)', async () => {
    const request = new Request('http://localhost/?limit=abc&offset=def', { method: 'GET' });
    const env = { CHANGELOG_DB: createMockD1([], 5) };

    const response = await worker.fetch(request, env, {});
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.pagination.limit, 50); // parseInt('abc') is NaN, NaN || 50 -> 50
    assert.strictEqual(data.pagination.offset, 0);
});

test('changelog-reader-worker: handles database errors with 500 status', async () => {
    const request = new Request('http://localhost/', { method: 'GET' });
    const env = { CHANGELOG_DB: createMockD1([], 0, true) }; // shouldFail = true

    const response = await worker.fetch(request, env, {});
    assert.strictEqual(response.status, 500);

    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Failed to fetch changelog entries');
    assert.strictEqual(data.message, 'Database error');
});

// Restore console.error at the end (not really needed since script exits, but good practice)
test.after(() => {
    console.error = originalConsoleError;
});
