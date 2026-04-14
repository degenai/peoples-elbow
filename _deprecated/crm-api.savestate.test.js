import test from 'node:test';
import assert from 'node:assert';
import { CrmApi } from './crm-api.js';

// Setup mock globals
global.localStorage = {
    _data: {},
    setItem: function(key, value) {
        this._data[key] = value;
    },
    getItem: function(key) {
        return this._data[key] || null;
    },
    clear: function() {
        this._data = {};
    }
};

global.sessionStorage = {
    _data: {},
    setItem: function(key, value) {
        this._data[key] = value;
    },
    getItem: function(key) {
        return this._data[key] || null;
    },
    clear: function() {
        this._data = {};
    }
};

const originalFetch = global.fetch;
const originalConsoleError = console.error;

test('CrmApi.saveState()', async (t) => {
    t.afterEach(() => {
        global.fetch = originalFetch;
        console.error = originalConsoleError;
        global.localStorage.clear();
        global.sessionStorage.clear();
        CrmApi.localState = { leads: [], activityLog: [] };
    });

    await t.test('successfully saves state and returns true', async () => {
        // Setup
        let fetchCallUrl = null;
        let fetchCallOptions = null;
        global.fetch = async (url, options) => {
            fetchCallUrl = url;
            fetchCallOptions = options;
            return { ok: true };
        };
        global.sessionStorage.setItem('admin_token', 'test_token');

        CrmApi.localState = { leads: [{ id: 1 }], activityLog: [] };

        // Execute
        const result = await CrmApi.saveState();

        // Verify return value
        assert.strictEqual(result, true);

        // Verify localStorage
        assert.strictEqual(
            global.localStorage.getItem('leadOTron_crmData'),
            JSON.stringify({ leads: [{ id: 1 }], activityLog: [] })
        );

        // Verify fetch call
        assert.strictEqual(fetchCallUrl, 'https://crm-worker.alex-adamczyk.workers.dev');
        assert.strictEqual(fetchCallOptions.method, 'PUT');
        assert.strictEqual(fetchCallOptions.headers['Content-Type'], 'application/json');
        assert.strictEqual(fetchCallOptions.headers['Authorization'], 'Bearer test_token');
        assert.strictEqual(fetchCallOptions.body, JSON.stringify({ leads: [{ id: 1 }], activityLog: [] }));
    });

    await t.test('returns false when fetch response is not ok', async () => {
        // Setup
        global.fetch = async () => {
            return { ok: false };
        };

        let loggedError = null;
        console.error = (msg, err) => {
            loggedError = err;
        };

        CrmApi.localState = { leads: [{ id: 2 }], activityLog: [] };

        // Execute
        const result = await CrmApi.saveState();

        // Verify return value
        assert.strictEqual(result, false);

        // Verify localStorage still updated
        assert.strictEqual(
            global.localStorage.getItem('leadOTron_crmData'),
            JSON.stringify({ leads: [{ id: 2 }], activityLog: [] })
        );

        // Verify error logged
        assert.ok(loggedError instanceof Error);
        assert.strictEqual(loggedError.message, 'Failed to save CRM data');
    });

    await t.test('returns false when fetch throws an exception', async () => {
        // Setup
        const networkError = new Error('Network offline');
        global.fetch = async () => {
            throw networkError;
        };

        let loggedError = null;
        console.error = (msg, err) => {
            loggedError = err;
        };

        CrmApi.localState = { leads: [{ id: 3 }], activityLog: [] };

        // Execute
        const result = await CrmApi.saveState();

        // Verify return value
        assert.strictEqual(result, false);

        // Verify localStorage still updated
        assert.strictEqual(
            global.localStorage.getItem('leadOTron_crmData'),
            JSON.stringify({ leads: [{ id: 3 }], activityLog: [] })
        );

        // Verify error logged
        assert.strictEqual(loggedError, networkError);
    });
});
