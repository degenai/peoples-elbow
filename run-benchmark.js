const { test } = require('node:test');
const assert = require('node:assert');

// Mock browser environment for componentLoader
global.window = {
    location: { pathname: '/index.html' }
};
global.document = {
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null
};
global.sessionStorage = {
    _data: {},
    setItem: function(id, val) { return this._data[id] = String(val); },
    getItem: function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
    removeItem: function(id) { return delete this._data[id]; },
    clear: function() { return this._data = {}; }
};

let fetchCallCount = 0;
// Mock fetch to simulate network delay
global.fetch = async (url) => {
    fetchCallCount++;
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulated 50ms network delay
    return {
        ok: true,
        json: async () => ({
            success: true,
            pagination: { total: 100 }
        })
    };
};

// Require the componentLoader code, we can read it and eval it
const fs = require('fs');
const componentsJsCode = fs.readFileSync('./js/components.js', 'utf8');

test('Measure caching improvement', async () => {
    eval(componentsJsCode);
    const loader = window.componentLoader;

    // Clear storage to make sure we start clean
    sessionStorage.clear();
    fetchCallCount = 0;

    // Simulate 10 iterations of navigation (e.g. index -> changelog -> about...)
    const iterations = 10;

    // Baseline simulation: What it used to do (force a new fetch every time)
    let baselineFetchCallCount = 0;
    const baselineStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        // Mock direct fetch from main.js / components.js before our change
        await fetch('https://changelog-reader.alex-adamczyk.workers.dev?limit=1&offset=0');
        await new Promise(r => setTimeout(r, 0)); // tick
    }
    const baselineEnd = performance.now();
    const baselineDuration = baselineEnd - baselineStart;

    // Reset cache state
    sessionStorage.clear();
    loader._versionCache = undefined;
    loader._versionPromise = null;
    fetchCallCount = 0;

    // Optimized simulation: using getVersion()
    const optStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        // Mock a navigation which triggers getVersion()
        // we'll clear the in-memory cache to simulate a real page navigation,
        // relying on sessionStorage
        loader._versionCache = undefined;
        loader._versionPromise = null;

        await loader.getVersion();
    }
    const optEnd = performance.now();
    const optDuration = optEnd - optStart;

    console.log(`\n================ PERFORMANCE RESULTS ================`);
    console.log(`Simulating ${iterations} page navigations...`);
    console.log(`\n--- BASELINE (Uncached API Call) ---`);
    console.log(`Time taken: ${baselineDuration.toFixed(2)}ms`);
    console.log(`Network requests made: ${iterations}`);

    console.log(`\n--- OPTIMIZED (sessionStorage Cache) ---`);
    console.log(`Time taken: ${optDuration.toFixed(2)}ms`);
    console.log(`Network requests made: ${fetchCallCount}`);

    console.log(`\n--- IMPROVEMENT ---`);
    console.log(`Speedup: ${((baselineDuration - optDuration) / baselineDuration * 100).toFixed(2)}% faster`);
    console.log(`API calls saved: ${iterations - fetchCallCount}`);
    console.log(`=====================================================\n`);

    assert.strictEqual(fetchCallCount, 1, "Should only make 1 network request");
    assert.ok(optDuration < baselineDuration, "Optimized version should be faster");
});
