import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT,sourceFiles,isPublic } from '../scripts/site-files.mjs';

test('the unused booking wrapper is absent from all runtime consumers and CSS', () => {
    const consumers = sourceFiles().filter(name => isPublic(name) && /\.(html|js|mjs)$/.test(name));
    assert.ok(consumers.length > 0);
    for (const name of consumers) {
        assert.ok(!readFileSync(join(ROOT,name),'utf8').includes('book-widget-section'),name);
    }
    assert.equal(readFileSync(join(ROOT,'css/main.css'),'utf8').includes('.book-widget-section'),false,'Remove the unused wrapper rules');
});
