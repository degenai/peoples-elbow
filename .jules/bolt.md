## 2026-04-09 - [N+1 KV Writes on Geocoding]
**Learning:** Performing sequential updates (`CrmApi.updateLead()`) when modifying a collection of records loops triggers N+1 API and Cloudflare KV `saveState()` operations, which takes down performance heavily because `saveState()` writes the entire CRM blob at once.
**Action:** Created `CrmApi.updateLeads()` to batch changes using a Map for O(1) index lookup and a single `saveState()`. Replaced the loop in `calculateRoute` to queue updates into an array, executing the single API call at the end of the loop.

## 2026-04-09 - [DOM Reflow vs Array Methods in UI updates]
**Learning:** While iterating arrays with `filter` and `map` repeatedly is slow (creating a bottleneck in UI initialization), blindly merging multiple disparate DOM update functions (like `<select>` innerHTML replacements) can cause severe functional regressions by destroying state (e.g., active dropdown selection).
**Action:** Extract expensive iterative data processing into standalone helper functions (`getUniqueNeighborhoods`) that return the pre-computed array in O(n) time, but keep the individual DOM mutators (`updateNeighborhoodFilter`, `updateNeighborhoodSelect`) separated to safely preserve user state (like active `<select>` values) during re-renders.

## 2026-04-09 - Precompile Regular Expressions in Hot Loops
**Learning:** Instantiating a `RegExp` object inside a loop causes O(N) dynamic regex compilations and severely degrades parsing performance. Combining fixed arrays into a single pre-compiled global regex using `(?:...)\b(A|B|...)\b` and executing it with `matchAll()` yields almost a 10x performance improvement.
**Action:** When evaluating arrays of literal values against text iteratively, always join the array elements into a single alternation pattern inside a pre-compiled `RegExp` object located at the top-level scope.

## 2026-04-10 - [Sorting Performance Optimizations]
**Learning:** Using `String.prototype.localeCompare` and `new Date()` inside an `Array.prototype.sort()` callback severely degrades performance due to repeated heavy object allocations and internationalization parsing overhead on every comparison.
**Action:** Replace `new Date()` comparisons with simple string comparison for ISO-8601 strings (which sort perfectly lexicographically). Replace `localeCompare` with case-insensitive relational operators (`<` and `>`) to eliminate CPU bottlenecks during sorting operations in hot loops.

## REJECTED PATTERNS - DO NOT REPEAT
The following changes have been proposed and rejected TWICE (2026-04-11, 2026-04-12). Do not propose them again:
- Replacing `.filter()` with `for`/`continue`/`push` in `getFilteredLeads()` — the functional version is shorter, more readable, and this CRM has ~200 leads
- Replacing `.map().join('')` with `for` loop string concatenation in `renderLeadList()` or `renderActivityLog()` — no measurable performance difference at this scale
- Wrapping template literal sections in IIFEs to avoid `.map().join('')` — makes code harder to read for zero gain
- Any change that increases line count without improving readability or fixing a real bottleneck

## 2026-04-12 - [Client-Side Data Caching with sessionStorage]
**Learning:** For application views populated by external API calls (e.g., the D1 changelog or statically loaded components), fetching the same unchanging data on every page navigation causes redundant network requests and slower rendering.
**Action:** Use `sessionStorage` to cache API responses and component states locally within the browser session, allowing near-instantaneous re-renders when users navigate back to the page.
