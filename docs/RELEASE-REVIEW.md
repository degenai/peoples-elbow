# Nitpick relay release review

Status: feature frozen; awaiting human inspection and production approval.

The engineering checkpoint is `ac665101b2612327b0ef7a1fdcdea36eae0ca525` on `preview/pe-maintenance-20260921`. This closure adds release documentation only. New nonblocking improvements belong on a later docket. The canonical production baseline is `52bcaa77e0ea728319c990451743a0e6d3737dbf`.

## Included scope

All 29 accepted items remain: 17 confirmed repairs, 11 optional cleanups and the exact gift-coupon color change from PR #97. The four closing repairs cover the resilient mobile-menu glyph and publication/test-discovery boundaries. The accepted extension covers the optional booking-status guard, built-asset/import/precache validation, test discovery and the separate harmless review artifact. The original implementation and extension commits are preserved.

## Inspect the review copy

The delivered review entry page provides a full page/document index, the consolidated changelog draft and exact source/build identity. It is an unlisted public review copy, not an authenticated private site. Use made-up details only.

Inspect the homepage menu and both inquiry forms, booking cards and retry wording, rate sheets and first-visit offers, privacy copy, printable intake, gift coupons and the CRM demo/import warning. Try a phone-sized window and reduced motion. The review-copy form acknowledgement must say nothing was sent or saved.

The ordinary site artifact and the safe review artifact are different outputs. The review notice, inert native forms, simulated requests and blocked storage are delivery controls, not production features. Fonts and styles may still be read from the permitted CDN hosts. PDFs and the downloadable archive retain their original content and links; do not use those links to make real bookings or submissions during review.

## Deliberate limitations

Email delivery, live Square booking, Google sign-in/Drive sync, app persistence and service-worker offline behavior are not exercised live by the safe preview. Read-only remote data feeds are blocked too, so the changelog and any other remote-data surface may show their fallback/error state. The release-note draft is available separately in the review index. Controlled tests of the ordinary artifact provide evidence for disabled behaviors, not live integration acceptance.

The source includes the changed email producer at `workers/host-form-worker.js`; it is not a public static asset and is not installed by a website deployment. Current and legacy producer/parser compatibility was tested synthetically. A separate Worker rollout and readback remain release gates.

Historic immutable Cloudflare deployments retain their original behavior. Only the explicitly delivered safe review URL is the review target. No old deployment deletion, DNS edit, project setting change, paid service or public tunnel is part of this closure.

## Consolidated D1 message and eventual release path

`docs/NITPICK-RELAY-RELEASE-MESSAGE.txt` is the intended full public commit message. It is a draft until Alex approves the release. Its first line becomes the changelog card title; the existing Show Details control reveals the body. No feed/UI redesign is required.

The current `update-d1-changelog.cjs` reads the latest D1 hash, runs reverse git log from that hash through HEAD, filters commits and posts their full messages to the existing writer. A draft file is not automatically ingested. The production workflow runs this writer only after successful GitHub Pages publication and only for main.

To produce ONE consolidated card with the existing feed, use one new release commit on top of then-current main containing the reviewed candidate tree and the exact message file. A squash release/merge is the supported route; retain the preview branch and its checkpoint history. This preserves all existing main and changelog history without force-push, deletion or new denylist entries. Do not use a normal multi-commit merge and assume it produces one card: the feed can ingest the individual checkpoints too.

Before that approved operation, verify main and D1 have not moved, confirm the final candidate diff and Worker rollout decision, and dry-run the existing reader/filter with all writes intercepted. After the release, check exact-SHA CI, successful public serving, separate approved Worker version and the actual D1 card. D1 publication follows successful site publication and must not announce this preview as shipped.

## Release gates still held

1. Alex inspects the complete safe preview and approves this exact candidate, its copy and this release note.
2. Decide and explicitly authorize production website promotion and the separate email Worker rollout. If the Worker is deferred, narrow the final note to the actually shipped scope.
3. Recheck main/D1 baselines and run verification justified by any closing changes or integration drift.
4. Publish the approved single release commit through the existing production gate; verify the real domain and Worker independently.
5. Read back the consolidated D1 entry after successful publication. Preserve existing history.

Nothing in this document authorizes those production actions. No real submissions or patient data are used for preview verification.

## Verification reused

The exact engineering tree passed 143 unit and 43 Chromium tests on Windows; Linux CI passed 142 unit tests, skipped one Windows-only test and passed all 43 browser tests. Eight mutation controls were detected, and the bounded final Opus review had zero unresolved findings. Closure verification checks that product/test/build files are byte-identical to that checkpoint, the delivered artifact matches its allowlist, public review behavior remains harmless and production/D1 remain unchanged. Detailed receipts and private preservation seals stay outside the website branch.
