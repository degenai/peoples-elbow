## 2026-04-09 - [N+1 KV Writes on Geocoding]
**Learning:** Performing sequential updates (`CrmApi.updateLead()`) when modifying a collection of records loops triggers N+1 API and Cloudflare KV `saveState()` operations, which takes down performance heavily because `saveState()` writes the entire CRM blob at once.
**Action:** Created `CrmApi.updateLeads()` to batch changes using a Map for O(1) index lookup and a single `saveState()`. Replaced the loop in `calculateRoute` to queue updates into an array, executing the single API call at the end of the loop.
