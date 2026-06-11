// Shared constants for Lead-o-Tron 5000

/**
 * Lead status values
 */
const STATUS = {
  ACTIVE: 'active',
  CONVERTED: 'converted',
  ARCHIVED: 'archived'
};

const STATUS_VALUES = [STATUS.ACTIVE, STATUS.CONVERTED, STATUS.ARCHIVED];

/**
 * Visit reception values
 */
const RECEPTION = {
  WARM: 'warm',
  LUKEWARM: 'lukewarm',
  COLD: 'cold'
};

const RECEPTION_VALUES = [RECEPTION.WARM, RECEPTION.LUKEWARM, RECEPTION.COLD];

/**
 * Venue type — what KIND of place a lead is. Drives filtering and
 * eventually the map markers. Kept short on purpose; if your outreach
 * runs into other kinds of venues, 'other' is the catch-all and you
 * add a new entry here (one place, one source of truth).
 */
const VENUE_TYPES = {
  CARD_SHOP: 'card-shop',
  FARMERS_MARKET: 'farmers-market',
  COMMUNITY_SPACE: 'community-space',
  OTHER: 'other'
};

const VENUE_TYPE_VALUES = [
  VENUE_TYPES.CARD_SHOP,
  VENUE_TYPES.FARMERS_MARKET,
  VENUE_TYPES.COMMUNITY_SPACE,
  VENUE_TYPES.OTHER
];

/**
 * Source — how a lead got into the CRM. 'field' = Alex captured it in
 * person; 'website' = it came in through the public site; 'import' = it
 * arrived in an imported JSON file. Useful for telling your own legwork
 * apart from inbound and migrated data.
 */
const SOURCES = {
  FIELD: 'field',
  WEBSITE: 'website',
  IMPORT: 'import'
};

const SOURCE_VALUES = [SOURCES.FIELD, SOURCES.WEBSITE, SOURCES.IMPORT];

/**
 * Default values
 */
const DEFAULTS = {
  STATUS: STATUS.ACTIVE,
  RECEPTION: RECEPTION.LUKEWARM
};

export {
  STATUS,
  STATUS_VALUES,
  RECEPTION,
  RECEPTION_VALUES,
  VENUE_TYPES,
  VENUE_TYPE_VALUES,
  SOURCES,
  SOURCE_VALUES,
  DEFAULTS
};
