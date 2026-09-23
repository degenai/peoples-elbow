import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('paper form clearly requests handwriting and provides provider and weeks writing lines', () => {
    const intake = read('intake-print/index.html');
    assert.match(intake, /Print and complete by hand/);
    assert.match(intake, /Chiropractic provider name<\/label><div class="fill">/);
    assert.match(intake, /weeks: <span class="fill fill-inline"/);
});

test('compact Saturday copy is qualified and the free rates row is a first-visit intro', () => {
    const book = read('book.html');
    assert.match(book, /SUN \+ SELECT SAT/);
    assert.match(book, /6: 'Saturday\. Elbow Room opens select Saturdays/);
    assert.doesNotMatch(book, /Same days\. Same places\. Every week\./);
    const rates = read('pe-session-rates.html');
    assert.match(rates, /First-visit intro<\/td>/);
    assert.deepEqual([...rates.matchAll(/class="price">([^<]+)/g)].map(m => m[1]), ['$45', '$85', '$125', '$165']);
});

test('privacy summary and collection text distinguish CRM records from emailed inquiries', () => {
    const policy = read('privacy.html');
    const summary = policy.split('<strong>The short version:</strong>')[1].split('</p>')[0];
    const collection = policy.split('What Data We Collect</h2>')[1].split('</p>')[0];
    for (const text of [summary, collection]) {
        assert.match(text, /CRM/);
        assert.match(text, /inbox/);
        assert.match(text, /contact|Contact/);
    }
    assert.doesNotMatch(policy, /We don't have your data|None\. The People's Elbow|It never leaves your device/);
    assert.match(policy, /Last updated: September 23, 2026/);
});

test('both Cherokee booking offers explicitly say thirty dollars off, with shared rates unchanged', () => {
    const book = read('book.html');
    assert.equal((book.match(/\$30 off/g) || []).length, 2, 'both the venue card and offer banner must say off');
    assert.deepEqual([...book.matchAll(/class="book-menu-price">([^<]+)/g)].map(m => m[1]), ['$25', '$45', '$85']);
    assert.match(book, /first full hour is \$60 instead of \$85/);
});
