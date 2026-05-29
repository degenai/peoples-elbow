# Steal This Site

This is the file to hand your AI. The People's Elbow runs a full website (forms, a database, a live changelog, animations) for about $10 a year. This document is how you build your own.

## The fastest path

Hand this file to your AI coding agent (Claude Code, Cursor, whatever you run) and just talk about it. Tell it what your project is, point it at this repo, and let it build you your own version. This whole site was built exactly that way.

You don't even need this repo specifically. Open a fresh AI coding session and say:

> "I want to make a Cloudflare and GitHub Pages website."

and go from there. Treat this repo as a working reference for what the finished thing looks like, not a template to clone. Build your own $10 solution. The flavor has to be yours.

## What the $10 actually is

The $10 a year is the domain name. Everything else runs on free tiers:

- **Hosting:** GitHub Pages or Cloudflare Pages, static HTML/CSS/JS, free.
- **Forms / serverless:** Cloudflare Workers, free tier.
- **Database:** Cloudflare D1 (SQLite), free tier.
- **CDN, SSL, DDoS protection:** included, free.

Compare that to $200 and up per year for Squarespace, Wix, and the rest of the website-builder racket.

## The architecture, so your AI can orient fast

- Plain **static HTML/CSS/JS**. No framework, no build step, nothing to compile.
- Shared **header/footer components** injected client-side by `js/components.js`, so every page stays in sync without server-side templating.
- **Contact forms** POST to a Cloudflare Worker that emails the submission. No database required for forms. See `workers/`.
- A **live changelog**: a GitHub Action writes each commit into a D1 database on push (`update-d1-changelog.js`), and a Worker reads it back for the site. The version badge counts commits.
- **Motion** is optional anime.js, added as progressive enhancement that degrades to a static page: `js/hero.js`, `js/countdown.js`, `js/reveal.js`, `js/gallery.js`.
- An optional **browser-based CRM** with Google Drive storage and no backend of its own: `js/crm/`.

## How to actually do it

1. Tell your AI what your project or cause is and what pages you need.
2. Point it at this repo and have it scaffold a static site with your content and colors.
3. Connect your repo to Cloudflare Pages for auto-deploy on every push.
4. Want a contact form? Have your AI set up a Cloudflare Worker for it.
5. Buy a domain (about $10) and point it at Pages.

Ask your AI coding agent at each step. It does the heavy lifting. You bring the intent.

## The spirit

Take it if it helps. I genuinely don't care whether you fork it, because nobody is going to be you. The point was never to clone mine. It's that the tools are this cheap and this good now, so go build your own.

If you want the click-by-click version, `steal-this-site.html` on the live site walks through fork-and-deploy.

**License:** 0BSD. Do anything, no attribution required, no strings. The code is yours. Anything you build with it is yours.
