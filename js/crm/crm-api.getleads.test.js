import test from 'node:test';
import assert from 'node:assert';
import { CrmApi } from './crm-api.js';

test('CrmApi.getLeads functionality', async (t) => {
    // Setup globals
    let localStorageData = {};
    global.localStorage = {
        getItem: (key) => localStorageData[key] || null,
        setItem: (key, value) => { localStorageData[key] = value; },
        clear: () => { localStorageData = {}; }
    };

    let sessionStorageData = {};
    global.sessionStorage = {
        getItem: (key) => sessionStorageData[key] || null,
        setItem: (key, value) => { sessionStorageData[key] = value; },
        clear: () => { sessionStorageData = {}; }
    };

    let fetchResponse = {};
    let fetchStatus = 200;
    let fetchError = null;

    global.fetch = async (url, options) => {
        if (fetchError) {
            throw fetchError;
        }
        return {
            ok: fetchStatus >= 200 && fetchStatus < 300,
            json: async () => fetchResponse
        };
    };

    // Reset state before each test
    t.beforeEach(() => {
        global.localStorage.clear();
        global.sessionStorage.clear();
        fetchResponse = { leads: [{ id: '1', name: 'Network Lead' }] };
        fetchStatus = 200;
        fetchError = null;
        CrmApi.localState = { leads: [], activityLog: [] };
    });

    await t.test('loads from localStorage first, then updates from fetch', async () => {
        global.localStorage.setItem('leadOTron_crmData', JSON.stringify({ leads: [{ id: 'cached', name: 'Cached Lead' }] }));
        fetchResponse = { leads: [{ id: 'network', name: 'Network Lead' }] };

        const result = await CrmApi.getLeads();

        assert.deepStrictEqual(result.leads, [{ id: 'network', name: 'Network Lead' }]);
        assert.deepStrictEqual(JSON.parse(global.localStorage.getItem('leadOTron_crmData')).leads, [{ id: 'network', name: 'Network Lead' }]);
    });

    await t.test('handles invalid localStorage data gracefully', async () => {
        global.localStorage.setItem('leadOTron_crmData', 'invalid-json');

        // Suppress console.warn during test
        const originalWarn = console.warn;
        let warnCalled = false;
        console.warn = () => { warnCalled = true; };

        try {
            const result = await CrmApi.getLeads();
            assert.strictEqual(warnCalled, true);
            assert.deepStrictEqual(result.leads, [{ id: '1', name: 'Network Lead' }]);
        } finally {
            console.warn = originalWarn; // restore
        }
    });

    await t.test('returns cached state if fetch fails', async () => {
        global.localStorage.setItem('leadOTron_crmData', JSON.stringify({ leads: [{ id: 'cached', name: 'Cached Lead' }] }));
        fetchStatus = 500; // Simulate network failure

        // Suppress console.error during test
        const originalError = console.error;
        let errorCalled = false;
        console.error = () => { errorCalled = true; };

        try {
            const result = await CrmApi.getLeads();
            assert.strictEqual(errorCalled, true);
            assert.deepStrictEqual(result.leads, [{ id: 'cached', name: 'Cached Lead' }]);
        } finally {
            console.error = originalError;
        }
    });

    await t.test('returns cached state if fetch throws', async () => {
        global.localStorage.setItem('leadOTron_crmData', JSON.stringify({ leads: [{ id: 'cached', name: 'Cached Lead' }] }));
        fetchError = new Error('Network error'); // Simulate fetch exception

        // Suppress console.error during test
        const originalError = console.error;
        let errorCalled = false;
        console.error = () => { errorCalled = true; };

        try {
            const result = await CrmApi.getLeads();
            assert.strictEqual(errorCalled, true);
            assert.deepStrictEqual(result.leads, [{ id: 'cached', name: 'Cached Lead' }]);
        } finally {
            console.error = originalError;
        }
    });

    await t.test('fetches API correctly and buffers to localStorage', async () => {
        fetchResponse = { leads: [{ id: 'api', name: 'API Lead' }] };
        const result = await CrmApi.getLeads();

        assert.deepStrictEqual(result.leads, [{ id: 'api', name: 'API Lead' }]);
        const bufferedData = JSON.parse(global.localStorage.getItem('leadOTron_crmData'));
        assert.deepStrictEqual(bufferedData.leads, [{ id: 'api', name: 'API Lead' }]);
        assert.deepStrictEqual(CrmApi.localState.leads, [{ id: 'api', name: 'API Lead' }]);
    });
});
