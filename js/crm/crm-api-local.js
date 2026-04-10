import { generateId, generateDateStr } from './utils.js';

const STORAGE_KEY = 'leadOTron_demoData';

// Seed data — realistic outreach leads for a chair massage operation.
// This is the starting state for new demo sessions; it resets on clear.
// Scores: space(1-5) + traffic(1-5) + vibes(1-5) = totalScore (3-15 max)
function getSeedData() {
  const now = Date.now();
  const daysAgo = d => new Date(now - d * 86400000).toISOString();
  return {
    leads: [
      {
        id: 'demo-001',
        name: 'Hustle House Gym',
        address: '9580 Main St, Woodstock, GA 30188',
        neighborhood: 'Woodstock',
        status: 'active',
        totalScore: 14,
        notes: 'Wednesday evening residency, going on 7 weeks. Family gym — owners are genuinely invested in the community angle, not just the novelty. Consistent clients week over week, some regulars emerging. Sarah has started coming on Wednesdays. Seth (trainer) was a client and became a word-of-mouth source. Pre-existing family relationship with Erica makes this the anchor venue — not replicable elsewhere but sets the template.',
        contacts: [
          { name: 'Matt Ribley', phone: '', email: '', isPrimary: true },
          { name: 'Erica Ribley', phone: '', email: '', isPrimary: false }
        ],
        visits: [
          { date: daysAgo(3),  notes: '7th Wednesday. Steady flow, 5 clients. A regular asked specifically when I\'d be back next week — that\'s the sign.', reception: 'warm' },
          { date: daysAgo(10), notes: '6th Wednesday. Seth brought two coworkers over. Good energy in the room.', reception: 'warm' },
          { date: daysAgo(17), notes: '5th Wednesday. Slow start, picked up after 7pm. 4 clients total.', reception: 'warm' },
          { date: daysAgo(24), notes: '4th Wednesday. Started feeling like a regular thing. Matt mentioned it to new members during orientation.', reception: 'warm' },
          { date: daysAgo(31), notes: '3rd Wednesday. First repeat client from week 1. That\'s validation.', reception: 'warm' },
          { date: daysAgo(38), notes: '2nd Wednesday. Better than the first — word had spread a little.', reception: 'warm' },
          { date: daysAgo(45), notes: 'First visit. Pitched Erica on the concept. She said yes immediately. Setup worked, 3 clients.', reception: 'warm' }
        ],
        lastVisit: daysAgo(3),
        created: daysAgo(50)
      },
      {
        id: 'demo-002',
        name: 'House Wolf Records',
        address: '784 Marietta St NW, Atlanta, GA 30318',
        neighborhood: 'Atlanta',
        status: 'converted',
        totalScore: 13,
        notes: 'Record Store Day booking — April 18. First fully independent cold-visit booking after roughly 60 doors. Fundraiser for Southern Cross German Shepherd Rescue (501c3, ~6.7K FB members, run by Laura Allen Wolf). Chair setup outside serving the line. Money is not the primary metric here — this is the proof of concept, the resume piece, the first photo op that shows the thing actually works in the wild.',
        contacts: [
          { name: 'Laura Allen Wolf', phone: '', email: '', isPrimary: true }
        ],
        visits: [
          { date: daysAgo(8), notes: 'Cold pitch. Walked in, introduced the concept, explained the 50/50 split model. Laura said yes on the spot. Booked April 18. This is the one.', reception: 'warm' }
        ],
        lastVisit: daysAgo(8),
        created: daysAgo(8)
      },
      {
        id: 'demo-003',
        name: 'Giga-Bites Cafe',
        address: '1851 Roswell Rd, Marietta, GA 30062',
        neighborhood: 'Marietta',
        status: 'active',
        totalScore: 13,
        notes: 'Primary next cold-pitch target. Friday Night Magic drafts, beer and food, 18-year community institution. Childhood synchronicity — visited this place as a kid with my dad. The crowd is exactly right: regulars, nerds, people who sit hunched over cards for 4 hours straight. They need this. Haven\'t pitched yet — want to go on a Friday to scope the layout first.',
        contacts: [],
        visits: [],
        lastVisit: null,
        created: daysAgo(14)
      },
      {
        id: 'demo-004',
        name: 'Trefoil Gardens',
        address: 'Kingsridge West, Woodstock, GA 30188',
        neighborhood: 'Woodstock',
        status: 'active',
        totalScore: 11,
        notes: 'Woodstock CSA run by Rob Miller — community garden plots on converted residential lots, shareholders get free weekly produce, surplus goes to farmers market. Pre-existing relationship: Rob staged vegetables in the Dogwood Growlers walk-in cooler before market days, I kept the deal and got a CSA share in return. He\'s the foremost praxis-doer in the area. Farmers market setup could work — physical labor crowd, good politics, perfect values alignment. Traffic is the limiting factor (market days only, seasonal).',
        contacts: [
          { name: 'Rob Miller', phone: '', email: '', isPrimary: true }
        ],
        visits: [],
        lastVisit: null,
        created: daysAgo(7)
      },
      {
        id: 'demo-005',
        name: 'Dixie Speedway',
        address: '900 Dixie Speedway, Woodstock, GA 30188',
        neighborhood: 'Woodstock',
        status: 'active',
        totalScore: 13,
        notes: 'Dirt track racing venue. This is a joke that is also not a joke. Racing crowds are enormous, the demographics skew working class, and the human body takes a beating at a speedway — drivers, pit crews, fans standing on concrete bleachers for 4 hours. Chairs fold up, setup is flexible, the concourse has space. The bit writes itself. "Fighting the Forces of Tension at 90mph." Haven\'t pitched yet. Need a plan for how to approach this one without getting laughed out of the parking lot — or maybe lean into that.',
        contacts: [],
        visits: [],
        lastVisit: null,
        created: daysAgo(2)
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
