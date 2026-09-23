# Safe review artifact

Production source and review delivery are separate outputs. Node 24 and the locked Python test requirements are required.

- `npm ci`, `python -m pip install -r requirements-test.txt`, `python -m playwright install chromium`, then `npm run verify` validate the ordinary `_site` and the separate `_preview-site`.
- `npm run preview` serves the immutable safe manifest at http://127.0.0.1:8780. It is computer-local. Close it with Ctrl+C. Rebuild/restart to view new changes.
- `npm run build:preview` rebuilds without running the gate; run `npm run verify` before any review or publication.

The generated preview changes delivery, not product source: a visible notice; noindex headers and metadata; browser-only synthetic form acknowledgements; inert native forms; external links, sign-in, embedded booking and service workers disabled; localStorage/sessionStorage/IndexedDB app persistence disabled. Runtime scripts remain inert until the preview bootstrap installs its controls. The promo's meta/JavaScript redirect and production redirect/domain files are excluded from this delivery.

Use synthetic details only. This is a review aid, not a security sandbox for arbitrary untrusted JavaScript. Fonts/styles may be fetched from the named Google/CDN hosts. Downloaded PDFs/archives retain their original content. The preview cannot exercise live booking, email delivery, Google/Drive sync, persistence or offline service workers; those boundaries are tested synthetically against the ordinary artifact. Pages without JavaScript remain inert; interactive components need the bootstrap.

## Hosting boundary

This repository does not configure or replace the Cloudflare Pages project's existing Git integration. An automatic raw-repository deployment is NOT this safe artifact. Changing provider configuration, publishing `_preview-site`, public tunnels, or deleting older immutable deployments requires explicit authorization. An older deployment URL stays as it was even after a branch moves.

After authorized activation, verify the exact deployment URL, response headers (including `form-action 'none'`), excluded routes, simulated forms, native form blocking, storage behavior and production invariance. Local success is not proof of Cloudflare behavior. Serve only a fresh origin with no prior service-worker registration. Never relabel a raw branch deployment as a safe preview.
