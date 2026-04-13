import { generateId, generateDateStr } from './utils.js';
import { normalizeLeadsData } from './data-normalizer.js';

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
        name: 'Ironwood Taproom',
        address: '412 Mill Creek Rd, Woodstock, GA 30188',
        neighborhood: 'Woodstock',
        status: 'active',
        scores: { space: 5, traffic: 4, vibes: 5 },
        totalScore: 14,
        notes: 'Craft taproom with long communal tables and a covered patio. Crowd is exactly the demographic — people who work desk jobs, drink IPAs on a Thursday, and lean their whole spine into a wooden chair for two hours. Manager Denise was immediately into it. Working toward a regular Thursday slot. Anchor venue potential if the residency takes.',
        contacts: [
          { name: 'Denise K.', phone: '', email: '', isPrimary: true }
        ],
        visits: [
          { date: daysAgo(35), notes: 'First cold walk-in. Talked to the bartender first, got pointed to Denise. Explained the 50/50 split concept. She asked if I had photos — I didn\'t. Said come back with documentation.', reception: 'lukewarm' },
          { date: daysAgo(22), notes: 'Came back with a printed one-pager and the Instagram up on my phone. Denise said she\'d bring it to the owner. Feels like a yes in slow motion.', reception: 'warm' },
          { date: daysAgo(8), notes: 'Owner Jamie was there. Thirty-second pitch, he said Thursday evenings work for him. Nothing signed, but verbal green light. Following up next week to nail down a date.', reception: 'warm' }
        ],
        lastVisit: daysAgo(8),
        created: daysAgo(38)
      },
      {
        id: 'demo-002',
        name: 'Hilltop Market Hall',
        address: '89 Commerce Dr, Marietta, GA 30060',
        neighborhood: 'Marietta',
        status: 'converted',
        scores: { space: 4, traffic: 5, vibes: 5 },
        totalScore: 14,
        notes: 'Indoor artisan market, open Thursdays and Saturdays. Mix of local vendors, food, live music some weekends. Foot traffic on a Saturday is the best of anything on this list — people dwell for an hour, not five minutes. Pitched the market coordinator who manages vendor space. Booked a Saturday trial slot. Went well. Re-booking pending.',
        contacts: [
          { name: 'Carol F.', phone: '', email: '', isPrimary: true }
        ],
        visits: [
          { date: daysAgo(55), notes: 'Scouted on a Thursday. Light traffic but laid out well — wide aisles, natural gathering spots near the coffee vendor. Talked to Carol who manages vendor relations. She was receptive, asked about liability insurance.', reception: 'warm' },
          { date: daysAgo(48), notes: 'Followed up with proof of licensure and a one-page overview. Carol booked a Saturday trial slot for two weeks out. No cut — just permission to set up and work the crowd.', reception: 'warm' },
          { date: daysAgo(34), notes: 'Trial day. Busy. Did 9 sessions in 4 hours, $140 in donations. Carol stopped by twice to check in — both times smiling. Said to reach out about a recurring slot.', reception: 'warm' }
        ],
        lastVisit: daysAgo(34),
        created: daysAgo(58)
      },
      {
        id: 'demo-003',
        name: 'The Foundry Tap',
        address: '1840 Westside Ave SW, Atlanta, GA 30310',
        neighborhood: 'Atlanta',
        status: 'active',
        scores: { space: 5, traffic: 5, vibes: 4 },
        totalScore: 14,
        notes: 'Enormous taproom in a converted warehouse — probably 8000 sq ft of floor space. Weekend crowds are massive. The scale is the whole appeal: one Saturday here could be worth three Woodstock events. The pitch is harder because you\'re not talking to an owner, you\'re talking to an events coordinator who has a process. Got a business card from a manager named Theo. Email follow-up sent, no response yet.',
        contacts: [
          { name: 'Theo M.', phone: '', email: '', isPrimary: true }
        ],
        visits: [
          { date: daysAgo(18), notes: 'Showed up on a Saturday afternoon to scope the space and catch a manager. Place was packed. Talked to Theo at the bar — friendly, said event bookings go through their coordinator and handed me a card. Not a no, just a process.', reception: 'lukewarm' }
        ],
        lastVisit: daysAgo(18),
        created: daysAgo(20)
      },
      {
        id: 'demo-004',
        name: 'Ridgeline Brewing',
        address: '114 E Main St, Canton, GA 30114',
        neighborhood: 'Canton',
        status: 'active',
        scores: { space: 3, traffic: 3, vibes: 5 },
        totalScore: 11,
        notes: 'Small neighborhood taproom, genuinely community-oriented. Owner Ryan runs it almost solo on weeknights. Space is tight — probably one chair max in any comfortable configuration — but the vibe is exactly right and Ryan was the most immediately enthusiastic owner I\'ve talked to. His words: "this is exactly the kind of thing I want in here." Logistics are the only obstacle.',
        contacts: [
          { name: 'Ryan H.', phone: '', email: '', isPrimary: true }
        ],
        visits: [
          { date: daysAgo(12), notes: 'Cold walk-in on a Tuesday. Three other customers in the place. Ryan came out from behind the bar, I gave the thirty-second pitch and he was sold before I finished it. We talked for twenty minutes about the mutual aid angle. Wants to make it work but acknowledged the space problem. Brainstormed a patio setup for warmer months.', reception: 'warm' }
        ],
        lastVisit: daysAgo(12),
        created: daysAgo(14)
      },
      {
        id: 'demo-005',
        name: 'Millwork Arts Center',
        address: '230 Creekside Blvd, Woodstock, GA 30188',
        neighborhood: 'Woodstock',
        status: 'active',
        scores: { space: 4, traffic: 2, vibes: 5 },
        totalScore: 11,
        notes: 'Community arts nonprofit — classes, gallery, performance space. Values alignment is near-perfect. The problem is baseline foot traffic is low; revenue would depend on scheduled events, not walk-ins. Pitched the programming director about tying sessions to opening nights or workshop days. She was warm but said event scheduling is six weeks out minimum. On the calendar follow-up list.',
        contacts: [
          { name: 'Priya N.', phone: '', email: '', isPrimary: true }
        ],
        visits: [
          { date: daysAgo(27), notes: 'Dropped in during an afternoon gallery opening. Light crowd but engaged people. Talked to Priya between greeting guests. She understood the concept immediately — said the board would love the mutual aid framing. Asked me to email a proposal for their spring event series.', reception: 'warm' },
          { date: daysAgo(14), notes: 'Sent the email a week ago, followed up in person today. Priya says programming committee meets monthly. She\'ll bring it to the April meeting. Feels like a slow yes.', reception: 'warm' }
        ],
        lastVisit: daysAgo(14),
        created: daysAgo(30)
      },
      {
        id: 'demo-006',
        name: 'Static Bar & Records',
        address: '2210 Glenwood Ave SE, Atlanta, GA 30316',
        neighborhood: 'Atlanta',
        status: 'active',
        scores: { space: 4, traffic: 5, vibes: 4 },
        totalScore: 13,
        notes: 'East side bar with a back patio and live music most weekends. Crowd skews young, creative, exactly the audience that gets what this is about. The bartender was enthusiastic. The manager on duty was skeptical — "we have a lot going on back there" — which is fair, the patio was being set up for a show. Need to come back on a non-show night and find whoever actually books events.',
        contacts: [
          { name: 'Bar staff (name TBD)', phone: '', email: '', isPrimary: false }
        ],
        visits: [
          { date: daysAgo(9), notes: 'Saturday evening, bad timing in retrospect. Patio was being used for sound check. Pitched the bartender who was into it and went to find a manager. Manager came out, politely said the back is committed through summer. Didn\'t shut the door but didn\'t open it either. Coming back on a Tuesday.', reception: 'lukewarm' }
        ],
        lastVisit: daysAgo(9),
        created: daysAgo(11)
      },
      {
        id: 'demo-007',
        name: 'Cherokee Pines Farmers Market',
        address: 'Olde Town Park, 200 Rope Mill Rd, Woodstock, GA 30188',
        neighborhood: 'Woodstock',
        status: 'active',
        scores: { space: 3, traffic: 4, vibes: 5 },
        totalScore: 12,
        notes: 'Saturday morning outdoor market, April through October. Foot traffic is solid for a mid-size suburban market. The challenge is vendor space is allocated annually in January — walk-in vending isn\'t possible without coordinator permission. Emailed the market manager about a demonstration / non-vendor appearance. No response yet. Long game.',
        contacts: [],
        visits: [],
        lastVisit: null,
        created: daysAgo(21)
      },
      {
        id: 'demo-008',
        name: 'Copperhead Brewing',
        address: '3100 Piedmont Hwy, Marietta, GA 30066',
        neighborhood: 'Marietta',
        status: 'archived',
        scores: { space: 3, traffic: 3, vibes: 2 },
        totalScore: 8,
        notes: 'Second visit confirmed what the first suggested — not the right fit. Clientele is mostly sports bar regulars, TVs everywhere, energy is loud and distracted rather than settled. Nobody there is looking for a quiet ten minutes. The concept isn\'t wrong for breweries generally, it\'s wrong for this one. Archiving. Not worth a third visit.',
        contacts: [],
        visits: [
          { date: daysAgo(42), notes: 'First visit. Game was on, place was loud. Pitched the bartender anyway — she said to talk to the owner but he wasn\'t in. Vibe felt off but wanted to give it a fair second look.', reception: 'lukewarm' },
          { date: daysAgo(29), notes: 'Second visit, midweek, quieter. Same energy though. Talked to who I think was the owner — he wasn\'t rude but he was clearly just humoring me. Not the crowd, not the room. Calling it.', reception: 'cold' }
        ],
        lastVisit: daysAgo(29),
        created: daysAgo(45)
      },
      {
        id: 'demo-009',
        name: 'Second Chance Animal Rescue',
        address: '78 Towne Lake Pkwy, Woodstock, GA 30189',
        neighborhood: 'Woodstock',
        status: 'active',
        scores: { space: 2, traffic: 2, vibes: 5 },
        totalScore: 9,
        notes: 'Local animal rescue nonprofit. Zero foot traffic at the facility itself — it\'s an office, not a storefront. The angle is their fundraising events: adoption days, annual gala, fall festival. If I can get on their vendor list for events, the values alignment alone makes this worth pursuing. A massage fundraiser for animal rescue is a very easy pitch to anyone within earshot.',
        contacts: [
          { name: 'Sandra B.', phone: '', email: '', isPrimary: true }
        ],
        visits: [
          { date: daysAgo(16), notes: 'Stopped by the office unannounced — probably not the move but it worked. Sandra is the volunteer coordinator. She immediately got it and was excited. Said they have an adoption event next month and would love to have something like this. Gave me her email.', reception: 'warm' }
        ],
        lastVisit: daysAgo(16),
        created: daysAgo(18)
      },
      {
        id: 'demo-010',
        name: 'Southside Commons Market',
        address: '520 Brownwood Ave SE, Atlanta, GA 30316',
        neighborhood: 'Atlanta',
        status: 'converted',
        scores: { space: 4, traffic: 5, vibes: 5 },
        totalScore: 14,
        notes: 'Saturday outdoor market, May through December. One of the best foot traffic environments I\'ve been in — people linger, browse, drink coffee, bring dogs. The crowd is young, progressive, and spending money intentionally. Market coordinator Marcus said yes with almost no convincing. Second booking already confirmed. Closest thing to a recurring urban slot on the list.',
        contacts: [
          { name: 'Marcus T.', phone: '', email: '', isPrimary: true }
        ],
        visits: [
          { date: daysAgo(50), notes: 'Scouted as a visitor first. Spent an hour watching flow — where people stopped, how long they stayed, vibe near the edges vs. center. Found Marcus at the info table and pitched him directly. He said he\'d been thinking about adding wellness vendors anyway.', reception: 'warm' },
          { date: daysAgo(43), notes: 'Confirmed the booking. Marcus said a regular vendor had space issues so there\'s a gap in the layout that fits a chair setup without crowding the aisles. Lucky timing.', reception: 'warm' },
          { date: daysAgo(36), notes: 'First market day. Long. Did 11 sessions between 9am and 1pm, $180 in donations split 50/50 with the market\'s community fund. Marcus said I was one of the most popular new additions in a while. Re-booked on the spot for three more dates.', reception: 'warm' },
          { date: daysAgo(15), notes: 'Second booking. Slower start (cold morning), picked up after 10am. 7 sessions, $110 total. One client was a chiropractor — she tipped $20 and said "you\'re doing it right." That\'s going in the notes.', reception: 'warm' }
        ],
        lastVisit: daysAgo(15),
        created: daysAgo(52)
      }
    ],
    activityLog: [
      { timestamp: new Date().toISOString(), message: 'Demo initialized. All data is local — nothing leaves your browser.' },
      { timestamp: daysAgo(8), message: 'Ironwood Taproom — verbal green light from owner Jamie for Thursday evenings.' },
      { timestamp: daysAgo(15), message: 'Southside Commons Market — second booking complete, 7 sessions, $110 raised.' },
      { timestamp: daysAgo(16), message: 'Second Chance Animal Rescue — adoption event angle being explored.' },
      { timestamp: daysAgo(29), message: 'Copperhead Brewing — archived after two visits. Wrong venue for this concept.' },
      { timestamp: daysAgo(34), message: 'Hilltop Market Hall — trial day: 9 sessions, $140 raised. Re-booking pending.' }
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
    const raw = load();
    const { data, needsSave } = normalizeLeadsData(raw);
    this.localState = data;
    if (needsSave) save(this.localState);
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
      lead.lastVisit = lead.visits.length > 0
        ? lead.visits.reduce((max, v) => v.date > max ? v.date : max, lead.visits[0].date)
        : null;
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
    return { defaultLocation: 'Woodstock, GA', defaultZipcode: '30188' };
  },

  async saveConfig(config) {
    localStorage.setItem('leadOTronConfig', JSON.stringify(config));
    return true;
  },

  async getDataPath() {
    return 'Local Storage (Demo Mode)';
  }
};
