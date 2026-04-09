import test, { describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { CrmApi } from './crm-api.js';

describe('CrmApi.exportJson', () => {
  let originalBlob, originalURL, originalDocument, originalConsoleError;

  beforeEach(() => {
    // Save original globals
    originalBlob = global.Blob;
    originalURL = global.URL;
    originalDocument = global.document;
    originalConsoleError = console.error;
  });

  afterEach(() => {
    // Restore original globals
    global.Blob = originalBlob;
    global.URL = originalURL;
    global.document = originalDocument;
    console.error = originalConsoleError;
  });

  test('successfully exports json', async () => {
    // Mock Blob
    const mockBlobInstance = { type: 'application/json' };
    class MockBlob {
      constructor(content, options) {
        assert.deepStrictEqual(content, [JSON.stringify(CrmApi.localState, null, 2)]);
        assert.deepStrictEqual(options, { type: 'application/json' });
        return mockBlobInstance;
      }
    }
    global.Blob = mock.fn(MockBlob);

    // Mock URL
    const fakeUrl = 'blob:http://localhost/fake-url';
    global.URL = {
      createObjectURL: mock.fn((blob) => {
        assert.strictEqual(blob, mockBlobInstance);
        return fakeUrl;
      }),
      revokeObjectURL: mock.fn((url) => {
        assert.strictEqual(url, fakeUrl);
      })
    };

    // Mock document
    const mockLink = {
      href: '',
      download: '',
      click: mock.fn()
    };

    global.document = {
      createElement: mock.fn((tag) => {
        assert.strictEqual(tag, 'a');
        return mockLink;
      }),
      body: {
        appendChild: mock.fn((node) => {
          assert.strictEqual(node, mockLink);
        }),
        removeChild: mock.fn((node) => {
          assert.strictEqual(node, mockLink);
        })
      }
    };

    const result = await CrmApi.exportJson();

    assert.strictEqual(result.success, true);
    assert.match(result.path, /^peoples-elbow-crm-export-\d{4}-\d{2}-\d{2}\.json$/);

    assert.strictEqual(global.Blob.mock.calls.length, 1);
    assert.strictEqual(global.URL.createObjectURL.mock.calls.length, 1);
    assert.strictEqual(global.document.createElement.mock.calls.length, 1);
    assert.strictEqual(global.document.body.appendChild.mock.calls.length, 1);
    assert.strictEqual(mockLink.click.mock.calls.length, 1);
    assert.strictEqual(global.document.body.removeChild.mock.calls.length, 1);
    assert.strictEqual(global.URL.revokeObjectURL.mock.calls.length, 1);
  });

  test('handles errors gracefully', async () => {
    // Mock Blob to throw an error via a Class
    class MockErrorBlob {
      constructor() {
        throw new Error('Blob creation failed');
      }
    }
    global.Blob = mock.fn(MockErrorBlob);

    // Mock console.error to prevent cluttering output
    let errorLogged = false;
    console.error = mock.fn((err) => {
      errorLogged = true;
      assert.strictEqual(err.message, 'Blob creation failed');
    });

    const result = await CrmApi.exportJson();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Blob creation failed');
    assert.strictEqual(console.error.mock.calls.length, 1);
    assert.strictEqual(errorLogged, true);
  });
});
