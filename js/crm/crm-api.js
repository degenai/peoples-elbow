import { generateId, generateDateStr } from './utils.js';

const CRM_API_URL = 'https://crm-worker.alex-adamczyk.workers.dev';

export const CrmApi = {
  // Store the fetched state locally so we can update it quickly and flush it to KV
  localState: {
    leads: [],
    activityLog: []
  },

  get token() {
    return sessionStorage.getItem('admin_token');
  },

  async getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  },

  async getLeads() {
    try {
      const response = await fetch(CRM_API_URL, {
        method: 'GET',
        headers: await this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CRM data');
      }

      const data = await response.json();
      this.localState = data;
      return this.localState;
    } catch (error) {
      console.error('Error fetching leads:', error);
      return this.localState;
    }
  },

  async saveState() {
    try {
      const response = await fetch(CRM_API_URL, {
        method: 'PUT',
        headers: await this.getHeaders(),
        body: JSON.stringify(this.localState)
      });

      if (!response.ok) {
        throw new Error('Failed to save CRM data');
      }
      return true;
    } catch (error) {
      console.error('Error saving leads:', error);
      return false;
    }
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

  async createLead(data) {
    const newLead = {
      ...data,
      id: generateId(),
      created: generateDateStr(),
      lastVisit: null
    };
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
      // Update lastVisit if needed, but for simplicity keep existing logic
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
      link.download = `peoples-elbow-crm-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, path: link.download };
    } catch(err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  },

  async importJson(fileInput) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
           resolve({ success: false, error: 'No file selected' });
           return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (!data.leads || !Array.isArray(data.leads)) {
               throw new Error('Invalid CRM data format');
            }
            this.localState = data;
            await this.saveState();
            resolve({ success: true });
          } catch(err) {
            resolve({ success: false, error: err.message });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },

  openUtilityBelt() {
    window.open('utility.html', '_blank');
  },

  addActivityLog(message) {
     const logEntry = {
        timestamp: new Date().toISOString(),
        message
     };
     this.localState.activityLog.unshift(logEntry);

     // Keep log to max 100 entries
     if (this.localState.activityLog.length > 100) {
       this.localState.activityLog.pop();
     }

     // We don't necessarily await saveState here to avoid blocking UI
     this.saveState();
     return logEntry;
  },

  async getConfig() {
    // Read from localStorage instead of main process
    const configStr = localStorage.getItem('leadOTronConfig');
    if (configStr) {
      try {
        return JSON.parse(configStr);
      } catch (e) {
        console.error('Failed to parse config from localStorage', e);
      }
    }
    return {
      deepseekApiKey: '',
      defaultLocation: 'Woodstock, GA',
      defaultZipcode: '30188'
    };
  },

  async saveConfig(config) {
    localStorage.setItem('leadOTronConfig', JSON.stringify(config));
    return true;
  },

  async getDataPath() {
     return 'Cloudflare KV (Online)';
  }
};
