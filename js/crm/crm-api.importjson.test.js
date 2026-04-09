import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CrmApi } from './crm-api.js';

describe('CrmApi.importJson', () => {
  let originalDocument;
  let originalFileReader;
  let mockInput;

  beforeEach(() => {
    originalDocument = global.document;
    originalFileReader = global.FileReader;

    mockInput = {
      type: '',
      accept: '',
      click: () => {
        // We trigger onchange in individual tests to simulate user interaction
      }
    };

    global.document = {
      createElement: (tag) => {
        if (tag === 'input') return mockInput;
        return {};
      }
    };
  });

  afterEach(() => {
    global.document = originalDocument;
    global.FileReader = originalFileReader;
  });

  it('should return error when no file is selected', async () => {
    // Override click to trigger onchange with no file
    mockInput.click = () => {
      mockInput.onchange({ target: { files: [] } });
    };

    const result = await CrmApi.importJson();
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'No file selected');
  });

  it('should return error on invalid JSON format', async () => {
    class MockFileReader {
      readAsText(file) {
        this.onload({ target: { result: 'invalid json' } });
      }
    }
    global.FileReader = MockFileReader;

    mockInput.click = () => {
      mockInput.onchange({ target: { files: [new Blob([''], { type: 'application/json' })] } });
    };

    const result = await CrmApi.importJson();
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Unexpected token'));
  });

  it('should return error when CRM data format is invalid (missing leads)', async () => {
    class MockFileReader {
      readAsText(file) {
        this.onload({ target: { result: JSON.stringify({ notLeads: [] }) } });
      }
    }
    global.FileReader = MockFileReader;

    mockInput.click = () => {
      mockInput.onchange({ target: { files: [new Blob([''], { type: 'application/json' })] } });
    };

    const result = await CrmApi.importJson();
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Invalid CRM data format');
  });

  it('should successfully import valid CRM data', async () => {
    const validData = { leads: [{ id: '1', name: 'Test Lead' }] };
    class MockFileReader {
      readAsText(file) {
        this.onload({ target: { result: JSON.stringify(validData) } });
      }
    }
    global.FileReader = MockFileReader;

    // Mock saveState to avoid making actual network requests or using localStorage
    const originalSaveState = CrmApi.saveState;
    CrmApi.saveState = async () => true;

    mockInput.click = () => {
      mockInput.onchange({ target: { files: [new Blob([''], { type: 'application/json' })] } });
    };

    const result = await CrmApi.importJson();

    // Restore saveState
    CrmApi.saveState = originalSaveState;

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(CrmApi.localState.leads, validData.leads);
  });
});
