import assert from 'node:assert/strict';
import test from 'node:test';
// Run: node --test workers/intake-worker.test.js
import worker, { BODY_LIMIT, handleIntakeRequest, recipients } from './intake-worker.js';

const submission = {
  session_type: 'Chair',
  where_today: 'Fixture Fest',
  full_name: 'Pat Example',
  phone: '770-555-0100',
  email: 'pat@example.com',
  visit_reason: 'Neck and right shoulder.',
  consent: 'yes',
  signature_name: 'Pat Example',
  conditions: ['Arthritis'],
  body_marks: '["front:neck=pain"]',
};

function env(overrides = {}) {
  const sent = [];
  return {
    sent,
    INTAKE_TO: 'therapist@example.com, Partner@Example.com',
    INTAKE_ALSO_TO: 'partner@example.com, alias@peoples-elbow.com',
    INTAKE_FROM: 'intake@peoples-elbow.com',
    INTAKE_FROM_NAME: "People's Elbow Intake",
    EMAIL: { send: async (payload) => { sent.push(payload); return { messageId: 'abc' }; } },
    INTAKE_RATE: { limit: async () => ({ success: true }) },
    ...overrides,
  };
}

const post = (body, headers = {}) => new Request('https://peoples-elbow.com/api/intake', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://peoples-elbow.com', 'cf-connecting-ip': '203.0.113.9', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

const formPost = (fields) => {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((x) => body.append(k, x)); else body.append(k, v);
  }
  return new Request('https://peoples-elbow.com/api/intake', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
};

test('recipients merge the secret and the var, de-duplicate case-insensitively, keep configured casing', () => {
  assert.deepEqual(recipients(env()), ['therapist@example.com', 'Partner@Example.com', 'alias@peoples-elbow.com']);
  assert.deepEqual(recipients({ INTAKE_TO: ' a@x.com ,, ' }), ['a@x.com']);
  assert.deepEqual(recipients({}), []);
});

test('the Worker entry answers only /api/intake; other paths under the route prefix get a JSON 404', async () => {
  const e = env();
  const r = await worker.fetch(post(submission), e);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(e.sent.length, 3, 'one message per recipient');

  assert.equal((await worker.fetch(new Request('https://peoples-elbow.com/api/intake'), e)).status, 405);
  const stray = await worker.fetch(new Request('https://peoples-elbow.com/api/intake-old', { method: 'POST' }), e);
  assert.equal(stray.status, 404);
  assert.equal(e.sent.length, 3);
});

test('a valid JSON submission becomes one email per recipient with the client as Reply-To', async () => {
  const e = env();
  const r = await handleIntakeRequest(post(submission), e);
  assert.equal(r.status, 200);
  assert.deepEqual(e.sent.map((m) => m.to), ['therapist@example.com', 'Partner@Example.com', 'alias@peoples-elbow.com']);
  const [mail] = e.sent;
  assert.deepEqual(mail.from, { email: 'intake@peoples-elbow.com', name: "People's Elbow Intake" });
  assert.equal(mail.replyTo, 'pat@example.com');
  assert.equal(mail.subject, 'Intake: Pat Example (Chair, Fixture Fest)');
  assert.match(mail.text, /Chair or table: Chair/);
  assert.match(mail.text, /Checked: Arthritis/);
  assert.match(mail.text, /Pain: front neck/);
  assert.match(mail.text, /from 203\.0\.113\.9/);
  assert.ok(mail.html.includes('Pat Example'));
});

test('a plain form post (no JS) sends the email and answers with an HTML page, not JSON', async () => {
  const e = env();
  const r = await handleIntakeRequest(formPost(submission), e);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.match(await r.text(), /Got it\. Thank you\./);
  assert.equal(e.sent.length, 3);
  assert.match(e.sent[0].text, /Checked: Arthritis/);

  const bad = await handleIntakeRequest(formPost({ ...submission, consent: '', full_name: '<b>x</b>' }), env());
  assert.equal(bad.status, 422);
  const page = await bad.text();
  assert.match(page, /Please read and agree/);
  assert.match(page, /The People's Elbow/);
  assert.ok(!page.includes('<b>x</b>'), 'errors are escaped');
});

test('validation failures return 422 with messages and send nothing', async () => {
  const e = env();
  const r = await handleIntakeRequest(post({ ...submission, consent: '', email: 'nope', session_type: '' }), e);
  assert.equal(r.status, 422);
  const body = await r.json();
  assert.equal(body.ok, false);
  assert.ok(body.errors.some((m) => /consent/.test(m)));
  assert.ok(body.errors.some((m) => /email/.test(m)));
  assert.ok(body.errors.includes('Please choose chair or table'));
  assert.equal(e.sent.length, 0);
});

test('the honeypot gets a fake success and no email', async () => {
  const e = env();
  const r = await handleIntakeRequest(post({ ...submission, xq_leave_blank: 'http://spam.example' }), e);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(e.sent.length, 0);
});

test('non-POST, cross-origin, null origin, rate-limited, oversized, and unsupported bodies are refused', async () => {
  const e = env();
  assert.equal((await handleIntakeRequest(new Request('https://peoples-elbow.com/api/intake'), e)).status, 405);
  assert.equal((await handleIntakeRequest(post(submission, { origin: 'https://evil.example' }), e)).status, 403);
  assert.equal((await handleIntakeRequest(post(submission, { origin: 'null' }), e)).status, 403, 'Origin: null must not crash');
  assert.equal((await handleIntakeRequest(post(submission), env({ INTAKE_RATE: { limit: async () => ({ success: false }) } }))).status, 429);
  const text = new Request('https://peoples-elbow.com/api/intake', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hi' });
  assert.equal((await handleIntakeRequest(text, e)).status, 415);
  const big = post(JSON.stringify({ ...submission, medications: 'x'.repeat(BODY_LIMIT) }));
  assert.equal((await handleIntakeRequest(big, e)).status, 413);
  const declared = post(submission, { 'content-length': String(BODY_LIMIT + 1) });
  assert.equal((await handleIntakeRequest(declared, e)).status, 413);
  assert.equal((await handleIntakeRequest(post('{not json'), e)).status, 400);
  assert.equal(e.sent.length, 0);
});

test('no configured recipients or a failed send returns 502 without leaking details', async () => {
  const r1 = await handleIntakeRequest(post(submission), env({ INTAKE_TO: '', INTAKE_ALSO_TO: '' }));
  assert.equal(r1.status, 502);
  const body = await r1.json();
  assert.equal(body.ok, false);
  assert.ok(!JSON.stringify(body).includes('INTAKE_TO'));

  const r2 = await handleIntakeRequest(post(submission), env({
    EMAIL: { send: async () => { throw Object.assign(new Error('nope'), { code: 'E_DAILY_LIMIT_EXCEEDED' }); } },
  }));
  assert.equal(r2.status, 502);
});

test('a coded Email Service error is final (no retry on the same binding); an uncoded one falls back', async () => {
  const calls = [];
  const coded = env({ INTAKE_TO: 'a@x.com', INTAKE_ALSO_TO: '', EMAIL: { send: async (p) => { calls.push(p); throw Object.assign(new Error('quota'), { code: 'E_DAILY_LIMIT_EXCEEDED' }); } } });
  assert.equal((await handleIntakeRequest(post(submission), coded)).status, 502);
  assert.equal(calls.length, 1, 'one attempt only');

  const uncoded = [];
  const legacy = env({ INTAKE_TO: 'a@x.com', INTAKE_ALSO_TO: '', EMAIL: { send: async (p) => { uncoded.push(p); throw new TypeError('expected EmailMessage'); } } });
  assert.equal((await handleIntakeRequest(post(submission), legacy)).status, 502, 'fallback path is unreachable under Node, so still 502');
  assert.equal(uncoded.length, 1, 'the fallback attempt fails before reaching send() in Node');
});

test('one rejected recipient does not sink the others; all rejected is a 502', async () => {
  const partial = env({
    EMAIL: { send: async (p) => { if (p.to === 'Partner@Example.com') throw Object.assign(new Error('nope'), { code: 'E_RECIPIENT_NOT_ALLOWED' }); return { messageId: 'ok' }; } },
  });
  const r1 = await handleIntakeRequest(post(submission), partial);
  assert.equal(r1.status, 200);

  const none = env({
    EMAIL: { send: async () => { throw Object.assign(new Error('nope'), { code: 'E_RECIPIENT_NOT_ALLOWED' }); } },
  });
  const r2 = await handleIntakeRequest(post(submission), none);
  assert.equal(r2.status, 502);
});

test('on workers.dev, only the allow-listed site origin may post, with CORS headers and a preflight', async () => {
  const WD = 'https://peoples-elbow-intake.alex-adamczyk.workers.dev/api/intake';
  const e = env({ INTAKE_ALLOWED_ORIGINS: 'https://peoples-elbow.com' });
  const cross = (origin, method = 'POST') => new Request(WD, {
    method,
    headers: { 'content-type': 'application/json', origin, 'cf-connecting-ip': '203.0.113.9' },
    body: method === 'POST' ? JSON.stringify(submission) : undefined,
  });

  const pre = await handleIntakeRequest(cross('https://peoples-elbow.com', 'OPTIONS'), e);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), 'https://peoples-elbow.com');
  assert.match(pre.headers.get('access-control-allow-headers'), /content-type/);

  const ok = await handleIntakeRequest(cross('https://peoples-elbow.com'), e);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://peoples-elbow.com');
  assert.equal(e.sent.length, 3);

  assert.equal((await handleIntakeRequest(cross('https://evil.example', 'OPTIONS'), e)).status, 403);
  const evil = await handleIntakeRequest(cross('https://evil.example'), e);
  assert.equal(evil.status, 403);
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  assert.equal((await handleIntakeRequest(cross('null'), e)).status, 403);
  assert.equal((await handleIntakeRequest(cross('https://peoples-elbow.com'), env())).status, 403, 'no allow-list, no cross-origin');
  assert.equal(e.sent.length, 3, 'refused posts send nothing');
});

test('the no-JS reply links back to the site, not the workers.dev host', async () => {
  const r = await handleIntakeRequest(formPost(submission), env());
  assert.match(await r.text(), /href="https:\/\/peoples-elbow\.com\/book\.html"/);
});
