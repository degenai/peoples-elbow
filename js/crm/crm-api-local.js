import { generateId, generateDateStr } from './utils.js';

const STORAGE_KEY = 'leadOTron_demoData';

// Seed data — realistic outreach leads for a chair massage operation.
// This is the starting state for new demo sessions; it resets on clear.
function getSeedData() {
  const now = Date.now();
  const daysAgo = d => new Date(now - d * 86400000).toISOString();
  return {
    leads: [
      {
        id: 'demo-001',
        name: 'Hustle House Gym',
        address: '123 Main St, Woodstock, GA 30188',
        neighborhood: 'Woodstock',
        status: 'active',
        totalScore: 85,
        notes: 'Wednesday residency. Hosts are enthusiastic — great community fit.',
        contacts: [{ name: 'Matt R.', phone: '555-0101', email: '', isPrimary: true }],
        visits: [
          { date: daysAgo(3), notes: 'Good turnout. 6 clients in 2 hours.', reception: 'warm' },
          { date: daysAgo(10), notes: 'First visit. Introduced the concept, left flyer.', reception: 'warm' }
        ],
        lastVisit: daysAgo(3),
        created: daysAgo(30)
      },
      {
        id: 'demo-002',
        name: 'House Wolf Records',
        address: '456 Canton St, Roswell, GA 30075',
        neighborhood: 'Roswell',
        status: 'converted',
        totalScore: 92,
        notes: 'Record Store Day booking confirmed. Fundraiser for local dog rescue.',
        contacts: [{ name: 'Laura W.', phone: '555-0202', email: 'laura@example.com', isPrimary: true }],
        visits: [
          { date: daysAgo(1), notes: 'Cold pitch success on first try. Booked on the spot.', reception: 'warm' }
        ],
        lastVisit: daysAgo(1),
        created: daysAgo(20)
      },
      {
        id: 'demo-003',
        name: 'Giga-Bites Cafe',
        address: '1851 Roswell Rd, Marietta, GA 30062',
        neighborhood: 'Marietta',
        status: 'active',
        totalScore: 70,
        notes: 'Friday Night Magic crowd. 18-year community institution. Strong potential, haven\'t pitched yet.',
        contacts: [],
        visits: [],
        lastVisit: null,
        created: daysAgo(14)
      },
      {
        id: 'demo-004',
        name: 'Stout Brothers Taproom',
        address: '789 Commerce Dr, Woodstock, GA 30188',
        neighborhood: 'Woodstock',
        status: 'active',
        totalScore: 50,
        notes: 'Two cold visits, no decision-maker available. Client Jill has owner contact — waiting on intro.',
        contacts: [],
        visits: [
          { date: daysAgo(21), notes: 'Second visit. Left card with bartender.', reception: 'neutral' },
          { date: daysAgo(35), notes: 'First cold visit. Left flyer.', reception: 'neutral' }
        ],
        lastVisit: daysAgo(21),
        created: daysAgo(40)
      }
    ],
    activityLog: [
      { timestamp: new Date().toISOString(), message: 'Demo initialized. All data is local — nothing leaves your browser.' }
    ]
  };
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through to seed */ }
  }
  const seed = getSeedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const CrmApi = {
  localState: { leads: [], activityLog: [] },

  // No auth in demo mode
  get token() { return 'demo'; },
  async getHeaders() { return { 'Content-Type': 'application/json' }; },

  async getLeads() {
    this.localState = load();
    return this.localState;
  },

  async saveState() {
    save(this.localState);
    return true;
  },

  async updateLead(id, data) {
    const index = this.localState.leads.findIndex(l => l.id === id);
    if (index !== -1) {
      this.localState.leads[index] = { ...this.localState.leads[index], ...data };
      await this.saveState();
      return this.localState.leads[index];
    }
    return null;
  },

  async updateLeads(updates) {
    if (!updates || updates.length === 0) return [];
    const leadIndices = new Map();
    this.localState.leads.forEach((lead, index) => leadIndices.set(lead.id, index));
    const updatedLeads = [];
    for (const update of updates) {
      const index = leadIndices.get(update.id);
      if (index !== undefined) {
        this.localState.leads[index] = { ...this.localState.leads[index], ...update.data };
        updatedLeads.push(this.localState.leads[index]);
      }
    }
    if (updatedLeads.length > 0) await this.saveState();
    return updatedLeads;
  },

  async createLead(data) {
    const newLead = { ...data, id: generateId(), created: generateDateStr(), lastVisit: null };
    this.localState.leads.push(newLead);
    await this.saveState();
    return newLead;
  },

  async addVisit(leadId, visitData) {
    const lead = this.localState.leads.find(l => l.id === leadId);
    if (lead) {
      lead.visits.push(visitData);
      lead.lastVisit = visitData.date;
      await this.saveState();
      return lead;
    }
    return null;
  },

  async updateVisit(leadId, visitIndex, visitData) {
    const lead = this.localState.leads.find(l => l.id === leadId);
    if (lead && lead.visits[visitIndex]) {
      lead.visits[visitIndex] = visitData;
      await this.saveState();
      return lead;
    }
    return null;
  },

  async deleteVisit(leadId, visitIndex) {
    const lead = this.localState.leads.find(l => l.id === leadId);
    if (lead && lead.visits[visitIndex]) {
      lead.visits.splice(visitIndex, 1);
      await this.saveState();
      return lead;
    }
    return null;
  },

  async deleteLead(id) {
    const index = this.localState.leads.findIndex(l => l.id === id);
    if (index !== -1) {
      this.localState.leads.splice(index, 1);
      await this.saveState();
      return true;
    }
    return false;
  },

  async exportJson() {
    try {
      const dataStr = JSON.stringify(this.localState, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leadotron-demo-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, path: link.download };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async importJson() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { resolve({ success: false, error: 'No file selected' }); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (!data.leads || !Array.isArray(data.leads)) throw new Error('Invalid CRM data format');
            this.localState = data;
            await this.saveState();
            resolve({ success: true });
          } catch (err) {
            resolve({ success: false, error: err.message });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },

  openUtilityBelt() {
    window.open('utility-demo.html', '_blank');
  },

  addActivityLog(message) {
    const logEntry = { timestamp: new Date().toISOString(), message };
    this.localState.activityLog.unshift(logEntry);
    if (this.localState.activityLog.length > 100) this.localState.activityLog.pop();
    this.saveState();
    return logEntry;
  },

  async getConfig() {
    const configStr = localStorage.getItem('leadOTronConfig');
    if (configStr) {
      try { return JSON.parse(configStr); } catch (e) { /* fall through */ }
    }
    return { deepseekApiKey: '', defaultLocation: 'Woodstock, GA', defaultZipcode: '30188' };
  },

  async saveConfig(config) {
    localStorage.setItem('leadOTronConfig', JSON.stringify(config));
    return true;
  },

  async getDataPath() {
    return 'Local Storage (Demo Mode)';
  }
};
