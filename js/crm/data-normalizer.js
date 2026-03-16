import { STATUS_VALUES, RECEPTION_VALUES, DEFAULTS } from './constants.js';
import { generateId as uuidv4 } from './utils.js';

function normalizeLeadsData(rawData) {
  let needsSave = false;
  const data = rawData && typeof rawData === 'object' ? { ...rawData } : {};

  if (!Array.isArray(data.leads)) {
    data.leads = [];
    needsSave = true;
  }

  if (!Array.isArray(data.activityLog)) {
    data.activityLog = [];
    needsSave = true;
  }

  data.leads = data.leads.map((lead) => {
    const { lead: normalizedLead, changed } = normalizeLead(lead);
    if (changed) needsSave = true;
    return normalizedLead;
  });

  const normalizedLog = data.activityLog
    .filter(entry => entry && typeof entry.message === 'string')
    .map(entry => ({
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString(),
      message: entry.message
    }));

  if (normalizedLog.length !== data.activityLog.length) {
    needsSave = true;
  }
  data.activityLog = normalizedLog;

  return { data, needsSave };
}

function normalizeLead(lead) {
  let changed = false;
  const rawLead = lead && typeof lead === 'object' ? { ...lead } : { name: String(lead ?? '') };
  if (rawLead !== lead) changed = true;

  if (!rawLead.id) {
    rawLead.id = uuidv4();
    changed = true;
  }

  const name = typeof rawLead.name === 'string' ? rawLead.name : String(rawLead.name || '');
  const address = typeof rawLead.address === 'string' ? rawLead.address : '';
  const neighborhood = typeof rawLead.neighborhood === 'string' ? rawLead.neighborhood : '';
  if (rawLead.name !== name || rawLead.address !== address || rawLead.neighborhood !== neighborhood) {
    changed = true;
  }
  rawLead.name = name;
  rawLead.address = address;
  rawLead.neighborhood = neighborhood;

  if (typeof rawLead.status !== 'string' || !STATUS_VALUES.includes(rawLead.status)) {
    rawLead.status = DEFAULTS.STATUS;
    changed = true;
  }

  if (!rawLead.created || typeof rawLead.created !== 'string') {
    rawLead.created = new Date().toISOString();
    changed = true;
  }

  const aiEnhanced = Boolean(rawLead.aiEnhanced);
  if (rawLead.aiEnhanced !== aiEnhanced) {
    changed = true;
  }
  rawLead.aiEnhanced = aiEnhanced;

  const { contacts, changed: contactsChanged, removedLegacyFields } = normalizeContacts(rawLead);
  if (contactsChanged || removedLegacyFields) {
    changed = true;
  }
  rawLead.contacts = contacts;

  const visits = Array.isArray(rawLead.visits) ? rawLead.visits : [];
  if (!Array.isArray(rawLead.visits)) changed = true;
  const normalizedVisits = visits.map((visit) => {
    const { visit: normalizedVisit, changed: visitChanged } = normalizeVisit(visit);
    if (visitChanged) changed = true;
    return normalizedVisit;
  });
  rawLead.visits = normalizedVisits;

  const scores = rawLead.scores && typeof rawLead.scores === 'object' ? { ...rawLead.scores } : {};
  const space = Number.isFinite(scores.space) ? scores.space : 3;
  const traffic = Number.isFinite(scores.traffic) ? scores.traffic : 3;
  const vibes = Number.isFinite(scores.vibes) ? scores.vibes : 3;
  if (scores.space !== space || scores.traffic !== traffic || scores.vibes !== vibes) {
    changed = true;
  }
  rawLead.scores = { space, traffic, vibes };

  const computedTotal = space + traffic + vibes;
  if (!Number.isFinite(rawLead.totalScore) || rawLead.totalScore !== computedTotal) {
    rawLead.totalScore = computedTotal;
    changed = true;
  }

  if (!rawLead.lastVisit && rawLead.visits.length > 0) {
    const lastVisit = rawLead.visits[rawLead.visits.length - 1]?.date;
    rawLead.lastVisit = typeof lastVisit === 'string' ? lastVisit : null;
    changed = true;
  } else if (rawLead.lastVisit && typeof rawLead.lastVisit !== 'string') {
    rawLead.lastVisit = null;
    changed = true;
  }

  return { lead: rawLead, changed };
}

function normalizeContacts(rawLead) {
  let changed = false;
  let removedLegacyFields = false;
  let contacts = Array.isArray(rawLead.contacts) ? rawLead.contacts : null;

  if (!contacts && (rawLead.contactName || rawLead.contactRole || rawLead.phone || rawLead.email)) {
    contacts = [
      {
        id: uuidv4(),
        name: rawLead.contactName || '',
        role: rawLead.contactRole || '',
        phone: rawLead.phone || '',
        email: rawLead.email || '',
        isPrimary: true
      }
    ];
    removedLegacyFields = true;
    changed = true;
  }

  if (!contacts) {
    contacts = [];
    changed = true;
  }

  let primaryIndex = -1;
  contacts = contacts.map((contact, index) => {
    const normalized = contact && typeof contact === 'object' ? { ...contact } : {};
    if (!normalized.id) {
      normalized.id = uuidv4();
      changed = true;
    }
    normalized.name = typeof normalized.name === 'string' ? normalized.name : '';
    normalized.role = typeof normalized.role === 'string' ? normalized.role : '';
    normalized.phone = typeof normalized.phone === 'string' ? normalized.phone : '';
    normalized.email = typeof normalized.email === 'string' ? normalized.email : '';

    const isPrimary = Boolean(normalized.isPrimary);
    if (isPrimary && primaryIndex === -1) {
      primaryIndex = index;
    } else if (isPrimary) {
      normalized.isPrimary = false;
      changed = true;
    } else {
      normalized.isPrimary = false;
    }

    return normalized;
  });

  if (contacts.length > 0 && primaryIndex === -1) {
    contacts[0].isPrimary = true;
    changed = true;
  }

  if (removedLegacyFields) {
    delete rawLead.contactName;
    delete rawLead.contactRole;
    delete rawLead.phone;
    delete rawLead.email;
  }

  return { contacts, changed, removedLegacyFields };
}

function normalizeVisit(visit) {
  if (!visit || typeof visit !== 'object') {
    return {
      visit: { date: new Date().toISOString(), notes: '', reception: DEFAULTS.RECEPTION },
      changed: true
    };
  }
  const date = typeof visit.date === 'string' ? visit.date : new Date().toISOString();
  const notes = typeof visit.notes === 'string' ? visit.notes : '';
  const reception = RECEPTION_VALUES.includes(visit.reception) ? visit.reception : DEFAULTS.RECEPTION;
  const changed = date !== visit.date || notes !== visit.notes || reception !== visit.reception;
  return {
    visit: { date, notes, reception },
    changed
  };
}

export {
  normalizeLeadsData,
  normalizeLead,
  normalizeContacts,
  normalizeVisit
};
