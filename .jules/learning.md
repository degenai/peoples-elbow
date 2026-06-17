## 2026-06-17 - Performance Benchmark CORS Issue
**Learning:** When testing ES modules (ESM) locally with headless browsers like Puppeteer or Playwright, serve the directory via a local HTTP server (e.g., `npx serve`) instead of using the `file://` protocol to prevent CORS policy blocking on cross-origin requests.
**Action:** Use a local server to test the benchmark to confirm optimization correctly.

## 2026-06-17 - Document Fragment Loop Optimization
**Learning:** Appending items repeatedly in a loop is expensive.
**Action:** Use DocumentFragment to batch DOM insertions when executing inside a loop.
