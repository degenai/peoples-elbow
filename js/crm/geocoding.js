// Geocoding Utility
// Uses Nominatim (OpenStreetMap) for free geocoding with rate limiting

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const RATE_LIMIT_MS = 1100; // Nominatim requires 1 request per second, add buffer

let lastRequestTime = 0;
let requestQueue = [];
let isProcessingQueue = false;

/**
 * Wait for rate limit before making a request.
 * Nominatim requires 1 request per second.
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
}

/**
 * Make a single geocoding request to Nominatim.
 *
 * @param {string} query - Search query
 * @returns {Promise<{lat: number, lon: number}|null>} Coordinates or null
 */
async function geocodeQuery(query) {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      addressdetails: '0',
      countrycodes: 'us'  // Limit to US for better results
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': 'Lead-o-Tron-5000/1.0 (personal-crm-app)'
      }
    });

    if (!response.ok) {
      console.error(`Geocoding failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const results = await response.json();

    if (results && results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lon: parseFloat(results[0].lon),
        displayName: results[0].display_name
      };
    }

    return null;
  } catch (error) {
    console.error(`Geocoding error for "${query}":`, error.message);
    return null;
  }
}

// US state abbreviations (exclude common street suffixes like Dr, St, Ave)
const STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

// Pre-compiled regex to find state abbreviation - must be preceded by comma or space (not hyphen like GA-92)
// and followed by zip code, end of string, or comma. Word boundaries prevent partial matches.
const STATE_REGEX = new RegExp(`(?:,\\s*|\\s)\\b(${STATE_ABBREVIATIONS.join('|')})\\b(?=\\s+\\d{5}|\\s*$|,)`, 'gi');

/**
 * Extract city, state, and zip from an address string.
 *
 * @param {string} address - Full address
 * @returns {Object} Parsed components
 */
function parseAddressComponents(address) {
  let state = null;
  let stateMatch = null;

  // Find all state abbreviation matches
  const matches = [...address.matchAll(STATE_REGEX)];

  if (matches.length > 0) {
    // Take the last match to handle edge cases like "404 Birch Ct, Denver, CO 80201"
    // where "Ct" might match "CT", but "CO" is the actual state at the end.
    const lastMatch = matches[matches.length - 1];
    state = lastMatch[1].toUpperCase();

    // Reconstruct match object similar to String.prototype.match()
    stateMatch = [lastMatch[0], lastMatch[1]];
    stateMatch.index = lastMatch.index;
  }

  // Extract zip code - must appear after the state (if found) or at end of address
  let zip = null;
  if (stateMatch) {
    // Look for zip after the state match
    const afterState = address.substring(stateMatch.index + stateMatch[0].length);
    const zipMatch = afterState.match(/^\s*(\d{5})(-\d{4})?\b/);
    if (zipMatch) {
      zip = zipMatch[1];
    }
  } else {
    // No state found, look for zip at end of address
    const zipMatch = address.match(/\b(\d{5})(-\d{4})?\s*$/);
    if (zipMatch) {
      zip = zipMatch[1];
    }
  }

  // Try to extract city - usually before state
  let city = null;
  if (state && stateMatch) {
    const beforeState = address.substring(0, stateMatch.index).trim().replace(/,\s*$/, '');

    // Get the last word(s) before state, after any comma or the street type
    // Common pattern: "123 Main St, City" or "123 Main St City"
    const parts = beforeState.split(/,\s*/);
    if (parts.length >= 2) {
      // City is the last comma-separated part
      city = parts[parts.length - 1].trim();
    } else {
      // No commas - try to get last word(s) that look like a city name
      const words = beforeState.split(/\s+/);
      // Skip street type words at the end
      const streetTypes = ['st', 'street', 'ave', 'avenue', 'dr', 'drive', 'rd', 'road',
                          'ln', 'lane', 'blvd', 'boulevard', 'ct', 'court', 'way', 'pl', 'place'];
      let cityWords = [];
      for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i].toLowerCase().replace(/[.,]/g, '');
        if (streetTypes.includes(word) || /^\d+$/.test(word)) {
          break;
        }
        cityWords.unshift(words[i]);
      }
      if (cityWords.length > 0) {
        city = cityWords.join(' ').replace(/[.,]/g, '').trim();
      }
    }
  }

  return { city, state, zip };
}

/**
 * Geocode a single address using Nominatim with fallback strategies.
 * If the exact address isn't found, tries progressively less specific queries.
 *
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lon: number, approximate?: boolean}|null>} Coordinates or null
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return null;
  }

  const cleanAddress = address.trim();
  const { city, state, zip } = parseAddressComponents(cleanAddress);

  // Strategy 1: Try full address
  await waitForRateLimit();
  let result = await geocodeQuery(cleanAddress);
  if (result) {
    return { lat: result.lat, lon: result.lon };
  }

  // Strategy 2: Try without zip code (sometimes helps)
  if (zip) {
    const withoutZip = cleanAddress.replace(/\b\d{5}(-\d{4})?\b/, '').trim();
    await waitForRateLimit();
    result = await geocodeQuery(withoutZip);
    if (result) {
      return { lat: result.lat, lon: result.lon, approximate: true };
    }
  }

  // Strategy 3: Try city + state + zip
  if (city && state) {
    const cityStateZip = zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`;
    await waitForRateLimit();
    result = await geocodeQuery(cityStateZip);
    if (result) {
      return { lat: result.lat, lon: result.lon, approximate: true };
    }
  }

  // Strategy 4: Try just city + state
  if (city && state) {
    await waitForRateLimit();
    result = await geocodeQuery(`${city}, ${state}`);
    if (result) {
      return { lat: result.lat, lon: result.lon, approximate: true };
    }
  }

  console.error(`Could not geocode: ${cleanAddress}`);
  return null;
}

/**
 * Geocode multiple addresses with rate limiting.
 * Returns a map of address -> coords.
 *
 * @param {string[]} addresses - Array of addresses
 * @param {Function} onProgress - Optional callback (current, total, address)
 * @returns {Promise<Map<string, {lat: number, lon: number}>>} Map of results
 */
async function geocodeAddresses(addresses, onProgress = null) {
  const results = new Map();
  const uniqueAddresses = [...new Set(addresses.filter(a => a && a.trim()))];

  for (let i = 0; i < uniqueAddresses.length; i++) {
    const address = uniqueAddresses[i];

    if (onProgress) {
      onProgress(i + 1, uniqueAddresses.length, address);
    }

    const coords = await geocodeAddress(address);
    if (coords) {
      results.set(address, coords);
    }
  }

  return results;
}

/**
 * Update leads with geocoded coordinates.
 * Only geocodes leads that don't already have coords.
 * Modifies leads in place and returns count of new geocodes.
 *
 * @param {Object[]} leads - Array of lead objects with address property
 * @param {Function} onProgress - Optional callback (current, total, leadName)
 * @returns {Promise<{geocoded: number, failed: number, skipped: number}>}
 */
async function geocodeLeads(leads, onProgress = null) {
  let geocoded = 0;
  let failed = 0;
  let skipped = 0;

  const leadsNeedingGeocode = leads.filter(lead =>
    lead.address &&
    lead.address.trim() &&
    (!lead.coords || !lead.coords.lat || !lead.coords.lon)
  );

  const leadsWithCoords = leads.filter(lead =>
    lead.coords && lead.coords.lat && lead.coords.lon
  );

  skipped = leadsWithCoords.length;

  for (let i = 0; i < leadsNeedingGeocode.length; i++) {
    const lead = leadsNeedingGeocode[i];

    if (onProgress) {
      onProgress(i + 1, leadsNeedingGeocode.length, lead.name || lead.address);
    }

    const coords = await geocodeAddress(lead.address);

    if (coords) {
      lead.coords = coords;
      geocoded++;
    } else {
      failed++;
    }
  }

  return { geocoded, failed, skipped };
}

/**
 * Estimate time to geocode a number of addresses.
 *
 * @param {number} count - Number of addresses to geocode
 * @returns {string} Human-readable time estimate
 */
function estimateGeocodeTime(count) {
  const seconds = count * (RATE_LIMIT_MS / 1000);

  if (seconds < 60) {
    return `~${Math.ceil(seconds)} seconds`;
  } else {
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

export {
  geocodeAddress,
  geocodeAddresses,
  geocodeLeads,
  estimateGeocodeTime,
  parseAddressComponents,
  RATE_LIMIT_MS
};
