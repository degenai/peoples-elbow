import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONDITIONS, FIELD_LIMIT, buildRawMime, describeMarks, normalize, parseMarks, renderEmail, validate,
} from './intake-core.js';

// Run: node --test workers/intake-core.test.js
const good = () => ({
  session_type: 'Chair',
  full_name: 'Pat Example',
  phone: '770-555-0100',
  email: 'pat@example.com',
  visit_reason: 'Neck and right shoulder, worse after driving.',
  consent: 'yes',
  signature_name: 'Pat Example',
});

test('normalize flattens FormData-style entries and keeps checkbox lists as arrays', () => {
  const fd = new URLSearchParams();
  fd.append('full_name', '  Pat ');
  fd.append('conditions', 'Arthritis');
  fd.append('conditions', 'Diabetes');
  fd.append('bad key!', 'x');
  const r = normalize(fd);
  assert.equal(r.full_name, 'Pat');
  assert.deepEqual(r.conditions, ['Arthritis', 'Diabetes']);
  assert.ok(!('bad key!' in r));
});

test('normalize wraps a single ticked condition into a list', () => {
  assert.deepEqual(normalize({ conditions: 'Stroke' }).conditions, ['Stroke']);
  assert.deepEqual(normalize({ conditions: ['Stroke', 'Diabetes'] }).conditions, ['Stroke', 'Diabetes']);
});

test('validate accepts a complete submission and drops unknown list values', () => {
  const res = validate({ ...good(), conditions: ['Arthritis', 'Made up'], pressure: 'Firm', pain_level: '7' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.conditions, ['Arthritis']);
  assert.equal(res.data.pressure, 'Firm');
  assert.equal(res.data.pain_level, '7');
  assert.equal(res.data.chiro_care, '');
});

test('validate names every missing required field', () => {
  const res = validate({ consent: 'yes' });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /full name/.test(e)));
  assert.ok(res.errors.some((e) => /phone/.test(e)));
  assert.ok(res.errors.some((e) => /email/.test(e)));
  assert.ok(res.errors.some((e) => /reason/.test(e)));
  assert.ok(res.errors.some((e) => /signature/.test(e)));
});

test('validate requires consent, a plausible email, and a 0-10 pain level', () => {
  assert.ok(validate({ ...good(), consent: '' }).errors.some((e) => /consent/.test(e)));
  assert.ok(validate({ ...good(), email: 'nope' }).errors.some((e) => /email/.test(e)));
  assert.ok(validate({ ...good(), pain_level: '11' }).errors.some((e) => /Pain level/.test(e)));
  assert.equal(validate({ ...good(), pain_level: '10' }).ok, true);
});

test('validate requires chair or table and normalizes its case; where-today stays optional', () => {
  const missing = validate({ ...good(), session_type: '' });
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.includes('Please choose chair or table'));
  assert.ok(validate({ ...good(), session_type: 'hammock' }).errors.includes('Please choose chair or table'));
  const res = validate({ ...good(), session_type: 'table' });
  assert.equal(res.ok, true);
  assert.equal(res.data.session_type, 'Table');
  assert.equal(res.data.where_today, '');
  assert.ok(!renderEmail(res.data).text.includes('Where we are today'), 'an empty where-today is omitted');
  assert.equal(renderEmail(validate({ ...good(), where_today: '  Brew\n  Fest ' }).data).subject, 'Intake: Pat Example (Chair, Brew Fest)', 'subject stays one line');
});

test('validate flags the honeypot as spam without other errors', () => {
  const res = validate({ ...good(), xq_leave_blank: 'http://spam.example' });
  assert.equal(res.ok, false);
  assert.equal(res.spam, true);
});

test('validate caps field and total size', () => {
  const res = validate({ ...good(), medications: 'x'.repeat(FIELD_LIMIT + 1) });
  assert.ok(res.errors.some((e) => /medications is too long/.test(e)));
});

test('parseMarks accepts JSON, comma lists, and objects; rejects junk and duplicates', () => {
  assert.deepEqual(parseMarks('["front:neck=pain","back:lower-back=tension","front:neck=avoid","nope"]'), [
    { figure: 'front', region: 'neck', kind: 'pain' },
    { figure: 'back', region: 'lower-back', kind: 'tension' },
  ]);
  assert.deepEqual(parseMarks('front:head=avoid,back:nowhere=pain'), [{ figure: 'front', region: 'head', kind: 'avoid' }]);
  assert.deepEqual(parseMarks([{ figure: 'back', region: 'upper-back', kind: 'pain' }]), [{ figure: 'back', region: 'upper-back', kind: 'pain' }]);
  assert.deepEqual(parseMarks(''), []);
  assert.deepEqual(parseMarks('{"a":1}'), []);
});

test('describeMarks groups by kind in a fixed order', () => {
  const s = describeMarks(parseMarks('back:lower-back=avoid,front:neck=pain,back:upper-back=pain'));
  assert.equal(s, 'Pain: front neck, back upper back\nAvoid: back lower back');
});

test('renderEmail includes the essentials, escapes HTML, and records the e-signature context', () => {
  const { data } = validate({
    ...good(),
    full_name: 'Pat <b>Example</b>',
    appointment_date: '2026-09-20',
    session_type: 'table',
    where_today: 'Hustle House',
    conditions: [CONDITIONS[0]],
    body_marks: '["front:chest=avoid"]',
    medications: 'Line one\nLine two',
  });
  const mail = renderEmail(data, {
    submittedAt: new Date('2026-09-12T18:30:00Z'), ip: '203.0.113.9', country: 'US', userAgent: 'TestBrowser/1.0',
  });
  assert.equal(mail.subject, 'Intake: Pat <b>Example</b> (Table, Hustle House, appt 2026-09-20)');
  assert.match(mail.text, /^TODAY\nWhere we are today: Hustle House\nChair or table: Table$/m);
  assert.ok(mail.text.indexOf('TODAY') < mail.text.indexOf('CLIENT INFORMATION'), 'PE fields lead the email');
  assert.match(mail.html, /Where we are today<\/td><td[^>]*>Hustle House</);
  assert.match(mail.text, /Informed consent \(Alex Adamczyk, LMT and The People's Elbow\) agreed/);
  assert.match(mail.text, /via peoples-elbow\.com\/intake/);
  assert.match(mail.text, /Full name: Pat <b>Example<\/b>/);
  assert.match(mail.text, /Checked: Blood clots \/ DVT/);
  assert.match(mail.text, /Avoid: front chest/);
  assert.match(mail.text, /Current medications:\n {2}Line one\n {2}Line two/);
  assert.match(mail.text, /signed electronically by "Pat Example" on Sep 12, 2026, 2:30 PM ET from 203\.0\.113\.9 \(US\)/);
  assert.match(mail.text, /Device: TestBrowser\/1\.0/);
  assert.ok(!mail.html.includes('<b>Example</b>'));
  assert.ok(mail.html.includes('Pat &lt;b&gt;Example&lt;/b&gt;'));
  assert.ok(!mail.text.includes('Areas to avoid:'), 'empty optional fields are omitted');
});

test('buildRawMime produces a base64 text/plain message with safe headers', () => {
  const raw = buildRawMime({
    from: 'intake@peoples-elbow.com',
    fromName: "People's Elbow Intake",
    to: 'therapist@example.com',
    replyTo: 'pat@example.com\r\nBcc: evil@example.com',
    subject: 'Intake: Zoë',
    text: 'héllo\n',
    date: new Date('2026-09-12T18:30:00Z'),
    id: 'fixed',
  });
  const [head, body] = raw.split('\r\n\r\n');
  assert.match(head, /^From: People's Elbow Intake <intake@peoples-elbow\.com>\r\n/);
  assert.match(head, /\r\nTo: therapist@example\.com\r\n/);
  assert.match(head, /\r\nReply-To: pat@example\.comBcc: evil@example\.com\r\n/, 'CRLF stripped from injected header');
  assert.match(head, /\r\nSubject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=\r\n/);
  assert.match(head, /\r\nMessage-ID: <fixed@peoples-elbow\.com>\r\n/);
  assert.match(head, /Content-Transfer-Encoding: base64/);
  assert.equal(Buffer.from(body.trim(), 'base64').toString('utf8'), 'héllo\n');
});
