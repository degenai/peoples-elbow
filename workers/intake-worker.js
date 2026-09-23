/**
 * The People's Elbow - /api/intake Worker.
 *
 * Ported from the Elbow Room intake (degenai/elbowroom, workers/intake.mjs). The
 * site itself is static on GitHub Pages behind a DNS-only record, so, like the
 * host form Worker, the form posts cross-origin to this Worker's workers.dev URL
 * (only https://peoples-elbow.com is allowed, via INTAKE_ALLOWED_ORIGINS). The
 * zone route peoples-elbow.com/api/intake* is also declared and takes over
 * same-origin if the apex record is ever proxied through Cloudflare.
 *
 * POST /api/intake  (JSON from the page script, or a plain form post)  ->  one
 * email per recipient. Nothing is stored. Rate limited per IP, honeypot-filtered,
 * body-size capped before parsing.
 *
 * Bindings (wrangler-intake.toml): EMAIL (send_email), INTAKE_RATE (ratelimit).
 * Vars: INTAKE_FROM, INTAKE_FROM_NAME, INTAKE_ALSO_TO (optional extra recipients),
 * INTAKE_ALLOWED_ORIGINS (comma-separated origins allowed to post cross-origin).
 * Secret: INTAKE_TO - comma-separated inboxes. Until the zone is onboarded for
 * Email Sending, every recipient must be a verified Email Routing destination;
 * after onboarding, any address works. Kept out of the public repo.
 */
import { buildRawMime, normalize, renderEmail, validate } from './intake-core.js';

// Absolute site links: a no-JS post may land on the workers.dev hostname.
export const SITE = 'https://peoples-elbow.com';

export const BODY_LIMIT = 64 * 1024; // bytes; the whole form is a few KB

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Plain HTML reply for a no-JS form post, so the client never lands on raw JSON.
function html(ok, errors, status = 200) {
  const body = ok
    ? `<h1>Got it. Thank you.</h1><p>Your intake is in Alex’s inbox. There is nothing else to do before your session.</p><p><a href="${SITE}/book.html">Back to booking</a></p>`
    : `<h1>Please check the form</h1><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><p>Use your browser’s Back button to fix it, or <a href="${SITE}/intake/">start over</a>.</p>`;
  return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Intake | The People's Elbow</title><meta name="robots" content="noindex"><style>body{font:16px/1.5 'Open Sans',system-ui,sans-serif;color:#1f2a25;max-width:560px;margin:40px auto;padding:0 16px}h1{font-family:Bangers,Impact,sans-serif;letter-spacing:.04em;color:#006937}a{color:#004225}</style></head><body>${body}</body></html>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Read the body once, capped, and return { record, wantsHtml } or an error Response. */
async function readBody(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  const isJson = type.includes('application/json');
  const isForm = type.includes('application/x-www-form-urlencoded');
  if (!isJson && !isForm) return json({ ok: false, errors: ['Unsupported content type'] }, 415);

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > BODY_LIMIT) return json({ ok: false, errors: ['The form is too long'] }, 413);
  const text = await request.text();
  if (text.length > BODY_LIMIT) return json({ ok: false, errors: ['The form is too long'] }, 413);

  try {
    const record = normalize(isJson ? JSON.parse(text) : new URLSearchParams(text));
    return { record, wantsHtml: isForm };
  } catch {
    return json({ ok: false, errors: ['Could not read the form'] }, 400);
  }
}

/** Distinct recipients: de-duplicated case-insensitively, sent exactly as configured. */
export function recipients(env) {
  const seen = new Map();
  for (const raw of `${env.INTAKE_TO || ''},${env.INTAKE_ALSO_TO || ''}`.split(',')) {
    const addr = raw.trim();
    if (addr && !seen.has(addr.toLowerCase())) seen.set(addr.toLowerCase(), addr);
  }
  return [...seen.values()];
}

async function sendOne(env, addr, from, fromName, mail, replyTo) {
  const payload = { to: addr, from: { email: from, name: fromName }, subject: mail.subject, text: mail.text, html: mail.html };
  if (replyTo) payload.replyTo = replyTo;
  try {
    const res = await env.EMAIL.send(payload);
    if (res && (res.messageId || res.success !== false)) return 'email-sending';
  } catch (err) {
    // A real Email Service verdict (E_* code) is final: rethrow it so the log
    // names the true cause and quota errors are not retried on the same binding.
    if (err?.code) throw err;
    // No code means the binding is the legacy EmailMessage-only kind; use that.
  }
  const { EmailMessage } = await import('cloudflare:email');
  const raw = buildRawMime({ from, fromName, to: addr, replyTo, subject: mail.subject, text: mail.text });
  await env.EMAIL.send(new EmailMessage(from, addr, raw));
  return 'email-routing';
}

async function deliver(env, mail, replyTo) {
  const from = env.INTAKE_FROM || 'intake@peoples-elbow.com';
  const fromName = env.INTAKE_FROM_NAME || "People's Elbow Intake";
  const to = recipients(env);
  if (!to.length) throw new Error('No intake recipients configured (INTAKE_TO / INTAKE_ALSO_TO)');
  if (!env.EMAIL) throw new Error('EMAIL binding is missing');

  // One message per recipient, so one bad address can never sink the others.
  // Success if at least one copy got through.
  const results = await Promise.allSettled(to.map((addr) => sendOne(env, addr, from, fromName, mail, replyTo)));
  let delivered = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') delivered += 1;
    else console.error(`intake: recipient ${i + 1} of ${to.length} failed:`, r.reason?.code || '', r.reason?.message || r.reason);
  });
  if (!delivered) throw results[0].reason;
  return { delivered, total: to.length };
}

/**
 * Origins allowed to post: the Worker's own origin plus INTAKE_ALLOWED_ORIGINS
 * (comma-separated). The site is served by GitHub Pages on a DNS-only record, so
 * the zone route does not fire today and the form posts to the workers.dev URL;
 * https://peoples-elbow.com is therefore allowed explicitly, and nothing else.
 */
export function allowedOrigins(env, request) {
  const extra = `${env.INTAKE_ALLOWED_ORIGINS || ''}`.split(',').map((o) => o.trim()).filter(Boolean);
  return new Set([new URL(request.url).origin, ...extra]);
}

export async function handleIntakeRequest(request, env) {
  // Allow-listed origins only. Cross-site posts (and the opaque "null" origin)
  // get a 403, never a crash. A request without Origin (curl, old browsers)
  // still passes through the rate limit, honeypot, and validation.
  const origin = request.headers.get('origin');
  const allowed = !origin || allowedOrigins(env, request).has(origin);

  if (request.method === 'OPTIONS') {
    if (!origin || !allowed) return json({ ok: false, errors: ['Bad origin'] }, 403);
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, accept',
        'access-control-max-age': '86400',
        vary: 'Origin',
      },
    });
  }

  const res = await handlePost(request, env, allowed);
  if (origin && allowed) {
    res.headers.set('access-control-allow-origin', origin);
    res.headers.append('vary', 'Origin');
  }
  return res;
}

async function handlePost(request, env, allowed) {
  if (request.method !== 'POST') return json({ ok: false, errors: ['Use POST'] }, 405);
  if (!allowed) return json({ ok: false, errors: ['Bad origin'] }, 403);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (env.INTAKE_RATE?.limit) {
    const { success } = await env.INTAKE_RATE.limit({ key: ip });
    if (!success) return json({ ok: false, errors: ['Too many submissions. Please wait a minute and try again.'] }, 429);
  }

  const read = await readBody(request);
  if (read instanceof Response) return read;
  const { record, wantsHtml } = read;
  const reply = (ok, errors, status) => (wantsHtml ? html(ok, errors, status) : json(ok ? { ok } : { ok, errors }, status));

  const result = validate(record);
  if (result.spam) return reply(true, [], 200); // bots get a quiet "success"
  if (!result.ok) return reply(false, result.errors, 422);

  const mail = renderEmail(result.data, {
    submittedAt: new Date(),
    ip,
    country: request.cf?.country,
    userAgent: request.headers.get('user-agent') || '',
  });

  // Logs carry an opaque id and counts only: no client names, no inbox addresses.
  const id = Math.random().toString(36).slice(2, 8);
  try {
    const { delivered, total } = await deliver(env, mail, result.data.email);
    console.log(`intake ${id}: delivered ${delivered}/${total}`);
    return reply(true, [], 200);
  } catch (err) {
    console.error(`intake ${id}: delivery failed:`, err?.code || '', err?.message || err);
    return reply(false, ['We could not send your form right now. Please try again in a few minutes, or fill out a paper form when you arrive.'], 502);
  }
}

// Worker entry, reached at <workers.dev>/api/intake (live today) and on the zone
// route peoples-elbow.com/api/intake* (fires once the apex record is proxied).
// Anything that is not exactly /api/intake gets a JSON 404.
export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== '/api/intake') return json({ ok: false, errors: ['Not found'] }, 404);
    return handleIntakeRequest(request, env);
  },
};
