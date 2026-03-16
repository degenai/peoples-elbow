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
  DEFAULTS
};
