# Nitpick relay release record

Status: production rollout authorized; verification must establish live completion.

The reviewed preview commit is `32a4a94241e6423b2d99546b83d464b3b27e0d8d`, with product code frozen at `ac665101b2612327b0ef7a1fdcdea36eae0ca525`. The preserved production parent is `52bcaa77e0ea728319c990451743a0e6d3737dbf`. The release contains that reviewed product tree and copy-only alignment of this record and the consolidated message.

The approved full release message is `docs/NITPICK-RELAY-RELEASE-MESSAGE.txt`, titled "The cleanup update: smoother booking, fewer hiccups". Its introduction credits the nitpick relay. It replaces the earlier technical draft. Test counts, hashes and deployment receipts belong in verification evidence rather than the public headline.

## Included scope

All 29 accepted original items remain: 17 confirmed repairs, 11 optional cleanups and the exact gift-coupon color change from PR #97. Four closing repairs cover the resilient mobile-menu glyph and publication/test-discovery boundaries. The accepted extension covers the optional booking-status guard, built-asset/import/precache validation, test discovery and the separate harmless review artifact. No new product feature is part of release closure.

## Release path

Use one new release commit atop the preserved main parent with the full approved message. Retain existing main history and the preview branch/checkpoints. No force push, history deletion or changelog-history deletion is required.

The existing `update-d1-changelog.cjs` reads the latest D1 hash, walks subsequent git commits in reverse order and posts their full messages. The release-note file itself is not ingested. A normal merge of all preview checkpoints could expose multiple cards, so the release uses the single-commit path and verifies its complete payload with all D1 network calls mocked.

The production workflow is restricted to main. Its full Node 24 gate validates source, tests, built references and both artifact types. GitHub Pages receives only the ordinary `_site` artifact. The simulated `_preview-site` must never be published as production. The changelog writer runs only after successful website publication.

The changed `workers/host-form-worker.js` is a separate deployment. Its reviewed new-format notifications remain readable by the already-deployed parser, and the new parser accepts benign legacy notifications. Verify that compatibility against the active versions, deploy the Worker first, verify its active version and unchanged email binding, then publish the website. This keeps the D1 post-publication note behind completion of the Worker step as well as the website gate. A website failure after Worker deployment is an explicit partial outcome; compatible earlier site code may remain live until resolution.

## Verification and rollback

Before production mutation, capture current main, D1 cursor, active Worker deployment/version and provider settings. Preserve unrelated canonical files and private sentinels. Run the full gate on the exact release candidate and inspect the final diff: only these two documentation files may differ from the reviewed preview commit.

After rollout, require exact-release-SHA CI and website deployment success, actual production route/asset identity, ordinary booking/form availability without preview scaffolding, independent active Worker version/source readback, and the exact public D1 title/body. Production browser checks do not submit forms or make bookings. No real test emails, customer data or CRM/Drive writes are used.

Rollback targets and private receipts live outside this public repository. Website rollback uses a new history-preserving revert commit and verified publication, not a force reset. Worker rollback targets the recorded prior version. Preserve public changelog history and describe any rollback honestly rather than deleting the shipped event.

## Review archive and evidence boundaries

The fixed review copy remains at https://7936973d.peoples-elbow.pages.dev/review/. It preserves the earlier preview message and is not the production serving path. Its notice, simulated forms, blocked storage and disabled integrations are review-delivery controls only. The approved readable message in this release supersedes that archived preview's draft.

The exact engineering tree passed 143 unit and 43 Chromium tests on Windows. Linux CI passed 142 unit tests, skipped one Windows-only test and passed all 43 browser tests. Eight mutation controls were detected, and the final bounded Opus review had zero unresolved findings. This is controlled test evidence, not proof of real email delivery or successful customer transactions.

Deployment identity and read-only live checks establish which code is active. Actual email delivery, completed bookings and Google/Drive writes are deliberately outside this rollout's verification. New nonblocking ideas, including work for other businesses, remain separate future work.
