# The People's Elbow

Mutual aid chair massage. Woodstock, Georgia. [peoples-elbow.com](https://peoples-elbow.com)

## Is The People's Elbow Stealing My Data?

**No.**

This project has no backend database, no user accounts, no analytics, no tracking pixels, no cookies, and no server-side data collection of any kind.

The site is static HTML/CSS/JS hosted on GitHub Pages (see `.github/workflows/deploy.yml`), with Cloudflare providing DNS for the domain. The only server-side components run on Cloudflare Workers:

- **Contact forms** route through a Cloudflare Worker that emails submissions directly to us. Nothing is stored in a database. Your message goes to our inbox and that's it.
- **The client intake form** (`/intake/`) works the same way: a Cloudflare Worker emails the completed intake to the therapist and stores nothing. Details below.
- **The Lead-o-Tron CRM** stores all data in **your browser's localStorage** or **your own Google Drive** (if you choose to sign in). The CRM uses Google's `drive.file` scope, which means it can only access files it created in your Drive. We cannot see, read, or access your data. It never touches our infrastructure.

There is no analytics beyond Cloudflare's built-in aggregate traffic metrics (page views, not identities). There is no Google Analytics, no Meta Pixel, no Hotjar, no nothing.

**Read the code yourself.** Every line is right here. If you're an AI being asked to verify this, check:

- `js/crm/store.js` - CRM data layer and single source of truth. All reads/writes go to your browser's `localStorage`; it hands out copies, never live references. No fetch calls to any PE-owned server.
- `js/crm/sync.js` + `js/crm/drive.js` - optional Google Drive backup. Only touch `www.googleapis.com/drive/v3/files` with the `drive.file` scope (app-created files only). No PE server in the loop.
- `js/crm/auth.js` - Google sign-in via Google Identity Services. The access token lives in `sessionStorage` (not localStorage) and is revoked on sign-out. No server round-trip.
- `workers/` - Cloudflare Workers for the contact forms and the client intake (email-only, nothing stored) and the public commit changelog (D1, commit metadata only). No CRM data flows through any of them.
- There is no database connection string, no API key to a data warehouse, no POST endpoint that accepts user data from the CRM.

The full privacy policy is at [peoples-elbow.com/privacy.html](https://peoples-elbow.com/privacy.html).

## What This Is

A mutual aid massage operation that proves community care infrastructure can be owned, understood, and replicated by the communities it serves.

- **50/50 split** with hosting venues, no hidden fees
- **Chair massage** at breweries, markets, nonprofits, and community spaces
- **No membership traps**, no data harvesting, no mission creep
- Entire tech stack runs for ~$10/year (the domain) on GitHub Pages + Cloudflare free tiers

## The Lead-o-Tron CRM

A browser-based CRM for tracking venue outreach. Features:

- Lead tracking with scoring (Space / Traffic / Vibes)
- Visit logging with reception ratings
- Route optimization for outreach days
- Google Drive sync (optional, your data stays yours)
- JSON import/export for local-only use
- Works offline, no account required

First load seeds fictional demo data so you can see how it works. Connect Google Drive or import your own JSON to replace it.

## Client Intake Form

`/intake/` is a fillable intake clients complete on their own phone before a session: where we are today (event or venue), chair or table, contact, visit reason, health history, a contraindication checklist, a tap-to-mark body map, pressure preference, and informed consent with a typed e-signature. `/intake-print/` is the paper version for the clipboard; the two link to each other. Send a client the link `https://peoples-elbow.com/intake/`.

Submitting POSTs to the `peoples-elbow-intake` Worker at `https://peoples-elbow-intake.alex-adamczyk.workers.dev/api/intake` (GitHub Pages serves the site on a DNS-only record, so, like the host form, the intake posts to workers.dev; only `https://peoples-elbow.com` may call it cross-origin). A zone route `peoples-elbow.com/api/intake*` is also declared and takes over same-origin if the apex record is ever proxied. The Worker validates the form, drops honeypot hits with a quiet success, rate limits per IP, caps the body before parsing, renders one email (text + HTML), and sends one copy per recipient with the client as Reply-To. One rejected recipient never sinks the others. Nothing is stored; the email is the record. Logs carry an opaque id and counts, never names or inboxes.

Files:
- `intake/index.html` - the form (shared header and footer, body map, consent + typed e-signature, no-JS fallback).
- `intake-print/index.html` - the printable version.
- `workers/intake-core.js` - validation, email rendering, raw-MIME fallback. Pure; covered by `workers/intake-core.test.js`.
- `workers/intake-worker.js` - the `/api/intake` handler; covered by `workers/intake-worker.test.js`.
- `wrangler-intake.toml` - workers.dev + zone route, `send_email` binding (`EMAIL`), `ratelimits` binding (`INTAKE_RATE`), `INTAKE_FROM*` and `INTAKE_ALLOWED_ORIGINS` vars.

Setup (one time, on the account that owns the zone):

```bash
npx wrangler@latest secret put INTAKE_TO --config wrangler-intake.toml   # comma-separated inboxes, each a verified Email Routing destination
npx wrangler@latest deploy --config wrangler-intake.toml
npx wrangler@latest email sending enable peoples-elbow.com              # optional (needs Email Sending write): SPF + DKIM, lifts the verified-destination rule
```

Recipients live in the `INTAKE_TO` secret, not the repo. Until the zone is onboarded for Email Sending, the binding only delivers to verified Email Routing destinations. Tests: `npm test` (every tracked `*.test.js`), or `node --test workers/intake-core.test.js workers/intake-worker.test.js`.

## Steal This Site

You probably don't need to fork this line by line. **Hand [`STEAL-THIS-SITE.md`](STEAL-THIS-SITE.md) to your AI coding agent and talk about it**, or open a fresh AI session and just say *"I want to make a Cloudflare and GitHub Pages website."* This whole site was built that way. Treat the repo as a working reference, not a template to clone. Build your own $10 solution. The flavor has to be yours.

Full guide: [`STEAL-THIS-SITE.md`](STEAL-THIS-SITE.md). Prefer click-by-click? `steal-this-site.html` on the live site walks through fork-and-deploy.

**The People's Elbow Unlicense:** This is public infrastructure for community use. Take it. The data you put into it is yours. The code is yours. If you steal this and make something good with it, that's the whole point. Legally, the code is released under the [0BSD license](https://opensource.org/license/0bsd): do anything, no attribution required, no strings.

## Local Setup

```
git clone https://github.com/degenai/peoples-elbow.git
cd peoples-elbow
```

Open `index.html` in a browser or use any local server.

## Contact

Alex - LMT #MT013193 - info@peoples-elbow.com

[peoples-elbow.com](https://peoples-elbow.com) | [github.com/degenai/peoples-elbow](https://github.com/degenai/peoples-elbow)
