/**
 * The People's Elbow - client intake, pure core.
 *
 * Ported from the Elbow Room intake (degenai/elbowroom, workers/intake-core.mjs)
 * with two PE fields up top: where we are today (event or venue, optional) and
 * the session type (chair or table, required).
 *
 * Everything here is runtime-agnostic (no cloudflare: imports) so `node --test`
 * covers it. The Worker glue lives in intake-worker.js; the form lives in
 * /intake/index.html.
 *
 * Contract: a submission is validated, rendered into a plain-text + HTML email
 * addressed to the therapist, and never stored anywhere. The email IS the record.
 */

export const FIELD_LIMIT = 2000;      // chars per field
export const TOTAL_LIMIT = 24000;     // chars across all fields
export const CONDITIONS = [
  'Blood clots / DVT', 'Heart condition', 'High blood pressure', 'Low blood pressure', 'Stroke',
  'Diabetes', 'Cancer (current or past)', 'Osteoporosis', 'Arthritis', 'Fibromyalgia',
  'Numbness / tingling', 'Varicose veins', 'Recent fracture / injury', 'Skin condition / rash',
  'Contagious condition',
];
export const PRESSURES = ['Light', 'Medium', 'Firm', 'Deep'];
export const SESSION_TYPES = ['Chair', 'Table'];
export const MARK_KINDS = ['pain', 'tension', 'avoid'];
export const REGIONS = {
  front: ['head', 'neck', 'chest', 'abdomen', 'right-arm', 'left-arm', 'right-leg', 'left-leg'],
  back: ['head', 'neck', 'upper-back', 'lower-back', 'left-arm', 'right-arm', 'left-leg', 'right-leg'],
};

// Order + labels drive the email layout.
export const SECTIONS = [
  ['Today', [
    ['where_today', 'Where we are today'], ['session_type', 'Chair or table'],
  ]],
  ['Client information', [
    ['full_name', 'Full name'], ['dob', 'Date of birth'], ['phone', 'Phone'], ['email', 'Email'],
    ['address', 'Address'], ['occupation', 'Occupation'], ['referral', 'How did you hear about us'],
    ['emergency_name', 'Emergency contact'], ['emergency_phone', 'Emergency contact phone'],
    ['appointment_date', 'Appointment date'],
  ]],
  ['This visit', [
    ['visit_reason', 'Main reason for the visit / areas of concern'], ['pain_level', 'Current pain level (0-10)'],
    ['chiro_care', 'Under chiropractic care'], ['chiro_with', 'Chiropractic care with'],
  ]],
  ['Health history', [
    ['medications', 'Current medications'], ['allergies', 'Allergies (incl. oils, lotions, scents)'],
    ['surgeries', 'Recent surgeries or injuries'], ['pregnant', 'Pregnant'], ['pregnant_weeks', 'Weeks'],
    ['illness', 'Recent illness or fever'],
  ]],
  ['Conditions', [
    ['conditions', 'Checked'], ['conditions_notes', 'Explanation'],
  ]],
  ['Areas of focus', [
    ['body_marks', 'Body map'], ['pain_areas', 'Where it hurts / feels tight (in their words)'],
    ['pressure', 'Pressure preference'], ['avoid_areas', 'Areas to avoid'],
  ]],
  ['Massage history & preferences', [
    ['massage_before', 'Had massage before'], ['scent', 'Scent / aromatherapy sensitivity'],
    ['relax_notes', 'Helps them relax / wants us to know'],
  ]],
];

const REQUIRED = [
  ['full_name', 'your full name'],
  ['phone', 'a phone number'],
  ['email', 'an email address'],
  ['visit_reason', 'the main reason for your visit'],
  ['signature_name', 'your name as a signature'],
];

const str = (v) => (v == null ? '' : String(v)).replace(/\r\n?/g, '\n').trim();

/**
 * Coerce a decoded body (JSON object or FormData/URLSearchParams) into a flat
 * record of trimmed strings; multi-valued fields become arrays of strings.
 */
export function normalize(input) {
  const out = {};
  const entries = typeof input?.entries === 'function' && !Array.isArray(input)
    ? [...input.entries()]
    : Object.entries(input || {});
  for (const [key, value] of entries) {
    if (typeof key !== 'string' || !/^[a-z_]{1,40}$/.test(key)) continue;
    const vals = Array.isArray(value) ? value.map(str) : [str(value)];
    if (key in out) out[key] = [].concat(out[key], vals);
    else out[key] = vals.length === 1 ? vals[0] : vals;
  }
  // A single ticked condition still arrives as a list.
  if ('conditions' in out && !Array.isArray(out.conditions)) out.conditions = out.conditions ? [out.conditions] : [];
  return out;
}

/** Parse body-map marks: accepts a JSON string, an array of "figure:region=kind", or nothing. */
export function parseMarks(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try { list = JSON.parse(raw); } catch { list = raw.split(','); }
  }
  if (!Array.isArray(list)) return [];
  const marks = [];
  for (const item of list) {
    let figure; let region; let kind;
    if (typeof item === 'string') {
      const m = item.trim().match(/^(front|back):([a-z-]+)=(pain|tension|avoid)$/);
      if (!m) continue;
      [, figure, region, kind] = m;
    } else if (item && typeof item === 'object') {
      ({ figure, region, kind } = item);
    } else continue;
    if (!REGIONS[figure]?.includes(region) || !MARK_KINDS.includes(kind)) continue;
    if (marks.some((x) => x.figure === figure && x.region === region)) continue;
    marks.push({ figure, region, kind });
  }
  return marks;
}

/**
 * Validate a normalized record. Returns { ok: true, data } or { ok: false, errors }.
 * `data` is the record to render: sanitized, marks parsed, lists constrained.
 */
export function validate(record) {
  const errors = [];
  const r = record || {};

  // Honeypot: real people never see this field. Bots fill it. The Worker fakes success.
  // Named so browser autofill heuristics (name/email/url/website...) never match it.
  if (str(r.xq_leave_blank)) return { ok: false, errors: ['spam'], spam: true };

  let total = 0;
  for (const [k, v] of Object.entries(r)) {
    const vals = Array.isArray(v) ? v : [v];
    for (const s of vals) {
      if (typeof s !== 'string') continue;
      if (s.length > FIELD_LIMIT) errors.push(`${k} is too long`);
      total += s.length;
    }
  }
  if (total > TOTAL_LIMIT) errors.push('The form is too long');

  // PE sets up either a chair or a table; the therapist needs to know which before
  // the client sits down. Case-insensitive so a no-JS or scripted post still lands.
  const sessionType = SESSION_TYPES.find((t) => t.toLowerCase() === str(r.session_type).toLowerCase()) || '';
  if (!sessionType) errors.push('Please choose chair or table');
  for (const [key, what] of REQUIRED) {
    if (!str(r[key])) errors.push(`Please add ${what}`);
  }
  const email = str(r.email);
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email)) errors.push('That email address does not look right');
  if (str(r.consent) !== 'yes') errors.push('Please read and agree to the informed consent');

  const pain = str(r.pain_level);
  if (pain && !/^(10|[0-9])$/.test(pain)) errors.push('Pain level must be a number from 0 to 10');

  if (errors.length) return { ok: false, errors };

  const conditions = (Array.isArray(r.conditions) ? r.conditions : []).filter((c) => CONDITIONS.includes(c));
  const pressure = PRESSURES.includes(str(r.pressure)) ? str(r.pressure) : '';
  const marks = parseMarks(r.body_marks);
  const yn = (v) => (['yes', 'no'].includes(str(v).toLowerCase()) ? str(v).toLowerCase() : '');

  const data = {};
  for (const [, fields] of SECTIONS) for (const [key] of fields) data[key] = str(r[key]);
  Object.assign(data, {
    session_type: sessionType, conditions, pressure, body_marks: marks,
    chiro_care: yn(r.chiro_care), pregnant: yn(r.pregnant), massage_before: yn(r.massage_before),
    signature_name: str(r.signature_name),
  });
  return { ok: true, data };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const regionLabel = (r) => r.replace(/-/g, ' ');

export function describeMarks(marks) {
  if (!marks?.length) return '';
  const by = { pain: [], tension: [], avoid: [] };
  for (const m of marks) by[m.kind].push(`${m.figure} ${regionLabel(m.region)}`);
  return MARK_KINDS
    .filter((k) => by[k].length)
    .map((k) => `${cap(k)}: ${by[k].join(', ')}`)
    .join('\n');
}

function displayValue(key, data) {
  const v = data[key];
  if (key === 'conditions') return v.length ? v.join(', ') : 'None checked';
  if (key === 'body_marks') return describeMarks(v) || 'No marks';
  if (Array.isArray(v)) return v.join(', ');
  if (['chiro_care', 'pregnant', 'massage_before'].includes(key)) return v ? cap(v) : '';
  return v;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
const FONT = "'Open Sans',Arial,sans-serif";
const H2 = `font:700 14px ${FONT};color:#004225;text-transform:uppercase;letter-spacing:.08em;border-left:4px solid #ffcc00;padding-left:8px;margin:18px 0 6px`;
const SOURCE = 'peoples-elbow.com/intake';

/**
 * Render the email. `meta` carries the submission context the Worker knows and
 * the client cannot forge: submittedAt (Date), ip, userAgent, country.
 */
export function renderEmail(data, meta = {}) {
  const when = meta.submittedAt instanceof Date ? meta.submittedAt : new Date();
  const whenLocal = when.toLocaleString('en-US', {
    timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short',
  });
  // Subject leads with the name, then the setup and place, so a phone inbox
  // shows "chair or table, where" without opening the message.
  const context = [data.session_type, data.where_today, data.appointment_date ? `appt ${data.appointment_date}` : '']
    .filter(Boolean).join(', ').replace(/\s+/g, ' ');
  const subject = `Intake: ${data.full_name}${context ? ` (${context})` : ''}`;

  const textLines = [`Client intake: ${data.full_name}`, `Submitted ${whenLocal} ET via ${SOURCE}`, ''];
  const htmlParts = [
    `<h1 style="font:400 26px Bangers,Impact,sans-serif;letter-spacing:.04em;color:#006937;margin:0 0 4px">Client intake: ${esc(data.full_name)}</h1>`,
    `<p style="margin:0 0 16px;color:#5e6863;font:13px ${FONT}">Submitted ${esc(whenLocal)} ET via ${SOURCE}</p>`,
  ];

  for (const [title, fields] of SECTIONS) {
    const rows = fields
      .map(([key, label]) => [label, displayValue(key, data)])
      .filter(([, v]) => v !== '');
    if (!rows.length) continue;
    textLines.push(title.toUpperCase());
    htmlParts.push(`<h2 style="${H2}">${esc(title)}</h2>`);
    htmlParts.push(`<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font:14px ${FONT};color:#1f2a25">`);
    for (const [label, value] of rows) {
      const multi = value.includes('\n');
      textLines.push(multi ? `${label}:\n  ${value.replace(/\n/g, '\n  ')}` : `${label}: ${value}`);
      htmlParts.push(`<tr><td style="vertical-align:top;padding:3px 12px 3px 0;color:#5e6863;white-space:nowrap">${esc(label)}</td><td style="vertical-align:top;padding:3px 0;white-space:pre-wrap">${esc(value)}</td></tr>`);
    }
    htmlParts.push('</table>');
    textLines.push('');
  }

  const consent = `Informed consent (Alex Adamczyk, LMT and The People's Elbow) agreed and signed electronically by "${data.signature_name}" on ${whenLocal} ET`
    + (meta.ip ? ` from ${meta.ip}${meta.country ? ` (${meta.country})` : ''}` : '')
    + (meta.userAgent ? `\nDevice: ${meta.userAgent}` : '');
  textLines.push('CONSENT', consent, '');
  htmlParts.push(`<h2 style="${H2}">Consent</h2>`);
  htmlParts.push(`<p style="font:13px ${FONT};color:#1f2a25;background:#f5f2e8;border:1px solid #b8c0bb;border-radius:6px;padding:10px 12px;white-space:pre-wrap;margin:0">${esc(consent)}</p>`);
  htmlParts.push(`<p style="font:12px ${FONT};color:#5e6863;margin-top:18px">This submission was emailed only; nothing is stored on the website. Reply to this message to reach the client.</p>`);

  return {
    subject,
    text: `${textLines.join('\n').trim()}\n`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#fff">${htmlParts.join('\n')}</body></html>`,
  };
}

// ---------- raw MIME (fallback path for the legacy EmailMessage API) ----------

function b64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const wrap76 = (s) => s.replace(/(.{76})/g, '$1\r\n');
const encHeader = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const cleanAddr = (s) => String(s).replace(/[\r\n<>]/g, '').trim();

/** Build a text/plain RFC 5322 message. `id` seeds Message-ID so tests are deterministic. */
export function buildRawMime({ from, fromName, to, replyTo, subject, text, date = new Date(), id }) {
  const fromHeader = fromName ? `${encHeader(fromName)} <${cleanAddr(from)}>` : cleanAddr(from);
  const msgId = id || `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: ${fromHeader}`,
    `To: ${cleanAddr(to)}`,
    replyTo ? `Reply-To: ${cleanAddr(replyTo)}` : null,
    `Subject: ${encHeader(subject)}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: <${msgId}@${cleanAddr(from).split('@')[1] || 'localhost'}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(text)),
  ].filter((l) => l !== null);
  return `${lines.join('\r\n')}\r\n`;
}
