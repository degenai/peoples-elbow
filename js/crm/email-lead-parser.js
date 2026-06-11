/**
 * email-lead-parser.js
 *
 * Turns a website host-form notification email into a partial CRM lead so a new
 * inbound lead can be ingested without anyone re-typing it. This closes the gap
 * between the homepage "host a table" form (which only ever emailed the inbox)
 * and Lead-o-Tron.
 *
 * It understands TWO formats, newest first:
 *
 *   1. FENCE (preferred) -- emails produced by host-form-worker.js now carry a
 *      machine-readable block:
 *
 *          --- LEAD JSON v1 ---
 *          {"schema":"lead-v1","name":"...","venueType":"...", ...}
 *          --- END LEAD JSON ---
 *
 *      The JSON was written with JSON.stringify on the worker side, so any
 *      quotes / HTML / newlines in user input arrive properly escaped. We parse
 *      it back to literal strings -- no eval, no string surgery.
 *
 *   2. LEGACY TEMPLATE (fallback) -- older emails (sent before the fence
 *      existed) have no JSON, just the deterministic human lines:
 *
 *          Venue Name: ...
 *          Contact Name: ...
 *          Contact Email: ...
 *          Venue Type: ...
 *          Message: ...   (or a "Message:" header followed by the body)
 *
 *      We scrape those lines as a best effort so historical leads aren't lost.
 *
 * Email clients love to mangle text: they prefix quoted replies with '>' (or
 * '> > ' for nested quotes), hard-wrap lines, and add stray whitespace. Both
 * code paths strip a leading run of '>' + spaces from every line before doing
 * anything else.
 *
 * Output is a PARTIAL lead in the v2 schema SHAPE -- only the fields we can know
 * from an email (name, venueType, source, notes, one contact). It is NOT a
 * complete, normalized lead: the CRM store runs it through data-normalizer.js,
 * which fills ids, scores, timestamps, etc. This parser deliberately does not
 * import the normalizer so it stays a dumb, dependency-free text-to-object step.
 *
 * @returns {{lead: object, warnings: string[]} | null}
 *          null when the text is not a recognizable host-form email at all.
 */

// Canonical venueType enum (must match the SHARED SCHEMA CONTRACT v2).
const VENUE_TYPE_ENUM = ['card-shop', 'farmers-market', 'community-space', 'other'];

// Map every reasonable spelling of a venue type back to the enum. Keys are
// lower-cased and stripped of spaces/underscores/hyphens before lookup, so
// "Card Shop", "card-shop", "card_shop" and "CARDSHOP" all collapse to the
// same key. Covers both the form's <option value> slugs AND the human-readable
// labels, because legacy emails could have carried either.
const VENUE_TYPE_ALIASES = {
  cardshop: 'card-shop',
  farmersmarket: 'farmers-market',
  communityspace: 'community-space',
  other: 'other'
};

/**
 * Strip a leading email-quote prefix ('>', '> ', '> > ', etc.) from one line.
 */
function stripQuotePrefix(line) {
  // Remove any run of '>' characters each optionally followed by spaces, anchored
  // at the start of the line. Then trim trailing whitespace.
  return line.replace(/^(\s*>+\s?)+/, '').replace(/\s+$/, '');
}

/**
 * Normalize a whole block of text: split into lines, de-quote each one.
 * Returns the cleaned lines AND the rejoined string (handy for regex over the
 * full block).
 */
function dequote(text) {
  const lines = String(text).split(/\r\n|\r|\n/).map(stripQuotePrefix);
  return { lines, joined: lines.join('\n') };
}

/**
 * Resolve a raw venue-type string to the enum. Pushes a warning (into the passed
 * array) when the input doesn't match anything known, and falls back to 'other'.
 */
function resolveVenueType(raw, warnings) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return '';
  }
  // If it's already a valid enum value, accept as-is.
  if (VENUE_TYPE_ENUM.includes(raw.trim())) {
    return raw.trim();
  }
  // Collapse to an alias key: lower-case, drop spaces / hyphens / underscores.
  const key = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (VENUE_TYPE_ALIASES[key]) {
    return VENUE_TYPE_ALIASES[key];
  }
  warnings.push(`Unknown venue type "${raw.trim()}" -- defaulted to "other".`);
  return 'other';
}

/**
 * Build the partial v2-shape lead from already-extracted plain fields.
 * Shared by both the fence path and the legacy path so the output shape is
 * identical no matter which format we parsed.
 */
function buildPartialLead({ name, venueType, message, email, contactName, sourceDate }, warnings) {
  const contacts = [];
  // Only attach a contact if we actually have something to put in it.
  if ((email && email.trim()) || (contactName && contactName.trim())) {
    contacts.push({
      name: contactName ? contactName.trim() : '',
      email: email ? email.trim() : '',
      isPrimary: true
    });
  }

  const lead = {
    name: name ? name.trim() : '',
    venueType: resolveVenueType(venueType, warnings),
    source: 'website',
    notes: message ? message.trim() : '',
    contacts
  };

  // Carry the original submission date through if we have one; the normalizer
  // will supply `created`/`updatedAt`, but knowing when the lead came in is
  // worth preserving for the activity log on the store side.
  if (sourceDate && typeof sourceDate === 'string') {
    lead.sourceDate = sourceDate;
  }

  return lead;
}

/**
 * Pull the first balanced {...} JSON object out of a string, starting the search
 * at `from`. We brace-count rather than searching for the closing fence marker,
 * because a hostile or quirky value could itself CONTAIN the text
 * "--- END LEAD JSON ---" (escaped inside a JSON string). Brace-counting that
 * respects string literals and escapes is the only safe way to find the real end
 * of the object. Returns the substring (including braces) or null.
 */
function extractJsonObject(text, from) {
  const start = text.indexOf('{', from);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      // Inside a JSON string: only an unescaped quote ends it. Track backslash
      // escaping so \" doesn't close the string and \\ doesn't swallow the next.
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null; // never balanced -- truncated object
}

/**
 * Try the fenced-JSON path. Returns {lead, warnings} or null if no usable fence.
 */
function parseFence(joined) {
  // Find the opening fence marker. Tolerant of surrounding whitespace; the
  // marker itself is fixed text the worker emits.
  const openIdx = joined.indexOf('--- LEAD JSON v1 ---');
  if (openIdx === -1) return null;
  const afterOpen = openIdx + '--- LEAD JSON v1 ---'.length;

  // Extract the JSON object by brace-balancing, NOT by slicing to the closing
  // marker -- string values may legitimately contain "}" or even the literal
  // "--- END LEAD JSON ---".
  const rawBlock = extractJsonObject(joined, afterOpen);
  if (rawBlock === null) {
    return { lead: null, warnings: ['Found LEAD JSON fence but the JSON object was incomplete/unbalanced.'] };
  }

  const warnings = [];
  let payload;
  try {
    payload = JSON.parse(rawBlock);
  } catch (err) {
    // The fence existed but the JSON was corrupted (line-wrapped by a client,
    // truncated, etc.). Warn and let the caller fall through to the legacy path.
    return { lead: null, warnings: [`Found LEAD JSON fence but could not parse it: ${err.message}`] };
  }

  if (!payload || typeof payload !== 'object') {
    return { lead: null, warnings: ['LEAD JSON fence did not contain an object.'] };
  }

  // Pull the primary contact out of the JSON's contacts array, if present.
  const firstContact = Array.isArray(payload.contacts) && payload.contacts.length > 0
    ? payload.contacts[0]
    : {};

  const lead = buildPartialLead({
    name: typeof payload.name === 'string' ? payload.name : '',
    venueType: typeof payload.venueType === 'string' ? payload.venueType : '',
    message: typeof payload.message === 'string' ? payload.message : '',
    email: typeof firstContact.email === 'string' ? firstContact.email : '',
    contactName: typeof firstContact.name === 'string' ? firstContact.name : '',
    sourceDate: typeof payload.sourceDate === 'string' ? payload.sourceDate : undefined
  }, warnings);

  return { lead, warnings };
}

/**
 * Try the legacy template path. Returns {lead, warnings} or null if the
 * tell-tale lines aren't present.
 */
function parseLegacyTemplate(lines, joined) {
  const warnings = [];

  // Pull a single-line "Label: value" field, case-insensitively, from the
  // de-quoted lines. Returns '' if not found.
  const field = (label) => {
    const re = new RegExp(`^\\s*${label}\\s*:\\s*(.*)$`, 'i');
    for (const line of lines) {
      const m = line.match(re);
      if (m) return m[1].trim();
    }
    return '';
  };

  const name = field('Venue Name');
  const contactName = field('Contact Name');
  const email = field('Contact Email');
  const venueType = field('Venue Type');

  // The message can be inline ("Message: hello") OR a header line ("Message:")
  // followed by the body on subsequent lines. Try inline first.
  let message = field('Message');
  if (!message) {
    // Look for a bare "Message:" header and take everything after it.
    const msgHeaderIdx = lines.findIndex(l => /^\s*Message\s*:\s*$/i.test(l));
    if (msgHeaderIdx !== -1) {
      message = lines
        .slice(msgHeaderIdx + 1)
        .join('\n')
        .trim();
    }
  }

  // Require at least a venue name or the request header to consider this a real
  // host-form email. Otherwise it's just unrelated text.
  const looksLikeHostEmail = name !== '' || /New Host Connection Request/i.test(joined);
  if (!looksLikeHostEmail) {
    return null;
  }

  const lead = buildPartialLead({
    name,
    venueType,
    message,
    email,
    contactName
  }, warnings);

  return { lead, warnings };
}

/**
 * Parse a host-form notification email into a partial CRM lead.
 * @param {string} text - the raw email body (plain text)
 * @returns {{lead: object, warnings: string[]} | null}
 */
export function parseLeadEmail(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return null;
  }

  const { lines, joined } = dequote(text);

  // 1. Preferred: the machine-readable fence.
  const fenceResult = parseFence(joined);
  if (fenceResult && fenceResult.lead) {
    return fenceResult;
  }

  // 2. Fallback: legacy template scraping. If the fence existed but was
  //    corrupted, carry its warning forward so the operator sees both.
  const legacyResult = parseLegacyTemplate(lines, joined);
  if (legacyResult && legacyResult.lead) {
    if (fenceResult && Array.isArray(fenceResult.warnings)) {
      legacyResult.warnings = [...fenceResult.warnings, ...legacyResult.warnings];
    }
    return legacyResult;
  }

  // Nothing recognizable.
  return null;
}
