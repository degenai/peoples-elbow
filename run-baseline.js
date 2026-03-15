const { test } = require('node:test');
const assert = require('node:assert');

test('Measure baseline', async () => {
    const start = performance.now();
    let successCount = 0;
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
        try {
            const response = await fetch('https://changelog-reader.alex-adamczyk.workers.dev?limit=1&offset=0');
            const data = await response.json();
            if (data.success) successCount++;
        } catch (e) {
            console.error(e);
        }
    }

    const end = performance.now();
    const duration = end - start;
    console.log(`Baseline execution time for ${iterations} sequential fetches: ${duration.toFixed(2)}ms`);
    console.log(`Average time per fetch: ${(duration/iterations).toFixed(2)}ms`);
});
