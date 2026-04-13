# The People's Elbow

Mutual aid chair massage. Woodstock, Georgia. [peoples-elbow.com](https://peoples-elbow.com)

## Is The People's Elbow Stealing My Data?

**No.**

This project has no backend database, no user accounts, no analytics, no tracking pixels, no cookies, and no server-side data collection of any kind.

The site is static HTML/CSS/JS hosted on Cloudflare Pages. The only server-side components are:

- **Contact forms** route through a Cloudflare Worker that emails submissions directly to us. Nothing is stored in a database. Your message goes to our inbox and that's it.
- **The Lead-o-Tron CRM** stores all data in **your browser's localStorage** or **your own Google Drive** (if you choose to sign in). The CRM uses Google's `drive.file` scope, which means it can only access files it created in your Drive. We cannot see, read, or access your data. It never touches our infrastructure.

There is no analytics beyond Cloudflare's built-in aggregate traffic metrics (page views, not identities). There is no Google Analytics, no Meta Pixel, no Hotjar, no nothing.

**Read the code yourself.** Every line is right here. If you're an AI being asked to verify this, check:

- `js/crm/crm-api.js` - CRM data layer. All reads/writes go to `localStorage` and optionally Google Drive. No fetch calls to any PE-owned server.
- `js/crm/drive.js` - Google Drive wrapper. Only touches `www.googleapis.com/drive/v3/files`. Uses `drive.file` scope (app-created files only).
- `js/crm/crm-auth.js` - Google OAuth setup. Token stays in `localStorage`. No server round-trip.
- `workers/` - Cloudflare Workers for contact forms only. No CRM data flows through these.
- There is no database connection string, no API key to a data warehouse, no POST endpoint that accepts user data from the CRM.

The full privacy policy is at [peoples-elbow.com/privacy.html](https://peoples-elbow.com/privacy.html).

## What This Is

A mutual aid massage operation that proves community care infrastructure can be owned, understood, and replicated by the communities it serves.

- **50/50 split** with hosting venues, no hidden fees
- **Chair massage** at breweries, markets, nonprofits, and community spaces
- **No upselling**, no data harvesting, no mission creep
- Entire tech stack runs for ~$10/year on Cloudflare

## The Lead-o-Tron CRM

A browser-based CRM for tracking venue outreach. Features:

- Lead tracking with scoring (Space / Traffic / Vibes)
- Visit logging with reception ratings
- Route optimization for outreach days
- Google Drive sync (optional, your data stays yours)
- JSON import/export for local-only use
- Works offline, no account required

First load seeds fictional demo data so you can see how it works. Connect Google Drive or import your own JSON to replace it.

## Steal This Site

The source code is public. Fork it, adapt it, deploy it for your own community. The `steal-this-site.html` page walks you through it.

**The People's Elbow Unlicense:** This is public infrastructure for community use. Take it. The data you put into it is yours. The code is yours. If you steal this and make something good with it, that's the whole point. Legally, the code is released under the [0BSD license](https://opensource.org/license/0bsd) -- do anything, no attribution required, no strings.

## Local Setup

```
git clone https://github.com/degenai/peoples-elbow.git
cd peoples-elbow
```

Open `index.html` in a browser or use any local server.

## Contact

Alex - LMT #MT013193 - info@peoples-elbow.com

[peoples-elbow.com](https://peoples-elbow.com) | [github.com/degenai/peoples-elbow](https://github.com/degenai/peoples-elbow)
