// Basic benchmark for d1-changelog appendChild issue
const { performance } = require('perf_hooks');

// Simple mock for the benchmark
class MockTimeline {
    constructor() {
        this.children = [];
    }
    appendChild(child) {
        this.children.push(child);
        // Simulate a reflow/repaint cost.
        for (let i = 0; i < 1000; i++) { Math.random(); }
    }
}

class MockDocumentFragment {
    constructor() {
        this.children = [];
    }
    appendChild(child) {
        this.children.push(child);
    }
}

class AdvancedMockTimeline extends MockTimeline {
    appendChild(child) {
        if (child instanceof MockDocumentFragment) {
            this.children.push(...child.children);
            for (let i = 0; i < 1000; i++) { Math.random(); } // one reflow
        } else {
            super.appendChild(child);
        }
    }
}

function runBenchmark() {
    const NUM_ITEMS = 20; // 20 entries per page

    let t0, t1, t2, t3;
    let baselineSum = 0;
    let optimizedSum = 0;
    const runs = 1000;

    for (let j = 0; j < runs; j++) {
        // Baseline: loop and append each item
        t0 = performance.now();
        const timeline1 = new AdvancedMockTimeline();
        for (let i = 0; i < NUM_ITEMS; i++) {
            timeline1.appendChild(`item-${i}`);
        }
        t1 = performance.now();
        baselineSum += (t1 - t0);

        // Optimized: DocumentFragment
        t2 = performance.now();
        const timeline2 = new AdvancedMockTimeline();
        const fragment = new MockDocumentFragment();
        for (let i = 0; i < NUM_ITEMS; i++) {
            fragment.appendChild(`item-${i}`);
        }
        timeline2.appendChild(fragment);
        t3 = performance.now();
        optimizedSum += (t3 - t2);
    }

    const baselineAvg = baselineSum / runs;
    const optimizedAvg = optimizedSum / runs;

    console.log(`Baseline avg time: ${baselineAvg.toFixed(4)} ms`);
    console.log(`Optimized avg time: ${optimizedAvg.toFixed(4)} ms`);
    console.log(`Improvement: ${((baselineAvg - optimizedAvg) / baselineAvg * 100).toFixed(2)}%`);
}

runBenchmark();
