import test from 'node:test';
import assert from 'node:assert';
import { createStore, memoryStorage } from './store.js';

test('memoryStorage API', () => {
  const storage = memoryStorage();
  assert.strictEqual(storage.getItem('foo'), null);
  storage.setItem('foo', 'bar');
  assert.strictEqual(storage.getItem('foo'), 'bar');
  storage.removeItem('foo');
  assert.strictEqual(storage.getItem('foo'), null);
});

test('createStore initializes with empty state if no data', () => {
  const store = createStore({ storage: memoryStorage() });
  // By default, init on empty storage loads demo data.
  store.init();
  assert.strictEqual(store.isDemo(), true);
  const leads = store.getLeads();
  assert.ok(leads.length > 0);
});

test('createStore initializes empty if hadRealData is set', () => {
  const storage = memoryStorage();
  storage.setItem('leadOTron_hadRealData', '1');
  const store = createStore({ storage });
  store.init();
  assert.strictEqual(store.isDemo(), false);
  const leads = store.getLeads();
  assert.strictEqual(leads.length, 0);
});

test('createLead clears demo data and creates a real lead', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init(); // loads demo data
  assert.strictEqual(store.isDemo(), true);

  const lead = store.createLead({ name: 'Test Lead' });
  assert.strictEqual(store.isDemo(), false); // demo cleared
  assert.strictEqual(store.getLeads().length, 1);
  assert.strictEqual(lead.name, 'Test Lead');
  assert.ok(lead.id);
  assert.ok(lead.created);
  assert.ok(lead.updatedAt);
});

test('updateLead modifies an existing lead', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.clearDemo();
  const lead = store.createLead({ name: 'Test Lead', notes: 'Old' });
  const updated = store.updateLead(lead.id, { notes: 'New' });
  assert.strictEqual(updated.notes, 'New');
  assert.strictEqual(updated.id, lead.id);
  assert.strictEqual(store.getLead(lead.id).notes, 'New');
});

test('updateLead returns null for missing lead', () => {
  const store = createStore({ storage: memoryStorage() });
  assert.strictEqual(store.updateLead('nope', { notes: 'New' }), null);
});

test('deleteLead removes an existing lead', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.clearDemo();
  const lead = store.createLead({ name: 'Test Lead' });
  assert.strictEqual(store.getLeads().length, 1);
  const result = store.deleteLead(lead.id);
  assert.strictEqual(result, true);
  assert.strictEqual(store.getLeads().length, 0);
});

test('deleteLead returns false for missing lead', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.clearDemo();
  assert.strictEqual(store.deleteLead('nope'), false);
});

test('addVisit adds a visit to a lead', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.clearDemo();
  const lead = store.createLead({ name: 'Test' });
  const result = store.addVisit(lead.id, { notes: 'A visit' });
  assert.ok(result);
  assert.strictEqual(result.visits.length, 1);
  assert.strictEqual(result.visits[0].notes, 'A visit');
  assert.ok(result.visits[0].id);
});

test('updateVisit updates an existing visit', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.clearDemo();
  const lead = store.createLead({ name: 'Test' });
  const l2 = store.addVisit(lead.id, { notes: 'V1' });
  const vId = l2.visits[0].id;
  const l3 = store.updateVisit(lead.id, vId, { notes: 'V2' });
  assert.strictEqual(l3.visits[0].notes, 'V2');
});

test('deleteVisit deletes an existing visit', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.clearDemo();
  const lead = store.createLead({ name: 'Test' });
  const l2 = store.addVisit(lead.id, { notes: 'V1' });
  const vId = l2.visits[0].id;
  const l3 = store.deleteVisit(lead.id, vId);
  assert.strictEqual(l3.visits.length, 0);
});

test('logActivity caps at 100 and ignores demo data', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init(); // Demo data

  // The demo data itself contains 6 log entries.
  const demoLogCount = store.getActivityLog().length;
  assert.strictEqual(demoLogCount, 6);

  store.logActivity('Ignored');
  assert.strictEqual(store.getActivityLog().length, demoLogCount); // No op on demo, length remains the same

  store.clearDemo();
  store.logActivity('Real message');
  assert.strictEqual(store.getActivityLog().length, 1);
  assert.strictEqual(store.getActivityLog()[0].message, 'Real message');

  for (let i = 0; i < 150; i++) {
    store.logActivity(`Message ${i}`);
  }
  assert.strictEqual(store.getActivityLog().length, 100);
  assert.strictEqual(store.getActivityLog()[0].message, 'Message 149');
});

test('subscribe notifies on changes', () => {
  const store = createStore({ storage: memoryStorage() });
  let count = 0;
  const unsub = store.subscribe(() => count++);
  store.init();
  store.clearDemo();
  store.createLead({ name: 'Test' });
  assert.ok(count >= 3); // init, clearDemo, createLead
  const beforeUnsub = count;
  unsub();
  store.createLead({ name: 'Test 2' });
  assert.strictEqual(count, beforeUnsub); // no longer notified
});

test('importData replaces state when valid', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  const res = store.importData({
    schemaVersion: 2,
    leads: [{ id: '1', name: 'Imported', contacts: [], visits: [] }],
    activityLog: []
  });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.count, 1);
  assert.strictEqual(store.isDemo(), false);
  const leads = store.getLeads();
  assert.strictEqual(leads[0].name, 'Imported');
});

test('importData fails on invalid input', () => {
  const store = createStore({ storage: memoryStorage() });
  const res = store.importData(null);
  assert.strictEqual(res.ok, false);
});

test('exportData returns the full state snapshot', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.clearDemo();
  store.createLead({ name: 'Test' });
  const exp = store.exportData();
  assert.ok(exp.leads);
  assert.strictEqual(exp.leads[0].name, 'Test');
});

test('replaceAll completely replaces the envelope', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.replaceAll({
    schemaVersion: 2,
    leads: [{ id: '2', name: 'Replaced', contacts: [], visits: [] }],
    activityLog: []
  });
  assert.strictEqual(store.getLeads().length, 1);
  assert.strictEqual(store.getLeads()[0].name, 'Replaced');
});

test('mergeRemote non-destructively merges last-write-wins', () => {
  const store = createStore({ storage: memoryStorage() });
  store.init();
  store.clearDemo();
  // Local lead
  // note: createLead sets updatedAt to nowISO(), which will overwrite any custom value
  // so we have to update it manually via updateLead or just use updateLead to set it
  // Actually, updateLead also sets it to nowISO().
  // Let's use importData or replaceAll to set up a specific timestamp.
  store.replaceAll({
    schemaVersion: 2,
    leads: [{ id: 'local1', name: 'Local Only', updatedAt: new Date('2023-01-01').toISOString(), contacts: [], visits: [] }],
    activityLog: []
  });

  // Remote envelope
  const remote = {
    schemaVersion: 2,
    leads: [
      { id: 'local1', name: 'Remote Wins', updatedAt: new Date('2023-01-02').toISOString(), contacts: [], visits: [] },
      { id: 'remote1', name: 'Remote Only', updatedAt: new Date('2023-01-01').toISOString(), contacts: [], visits: [] }
    ],
    activityLog: []
  };

  store.mergeRemote(remote);
  const leads = store.getLeads();
  assert.strictEqual(leads.length, 2);
  const mergedLocal = store.getLead('local1');
  assert.strictEqual(mergedLocal.name, 'Remote Wins'); // remote had newer date
  assert.ok(store.getLead('remote1'));
});

test('init corrupt JSON recovery', () => {
  const storage = memoryStorage();
  storage.setItem('leadOTron_crmData', '{invalid json');
  const store = createStore({ storage });
  store.init();
  assert.strictEqual(storage.getItem('leadOTron_crmData_recovery'), '{invalid json');
});
