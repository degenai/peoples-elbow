import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

test('Elbow Room relationship page owns one aligned, indexable URL', async () => {
    const html = await read('elbow-room.html');

    assert.match(html, /<title>Elbow Room Massage Therapy &amp; The People's Elbow \| Two Brands, One Therapist<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]*Elbow Room Massage Therapy[^"]*The People's Elbow[^"]*">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/peoples-elbow\.com\/elbow-room\.html">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/peoples-elbow\.com\/elbow-room\.html">/);
    assert.doesNotMatch(html, /noindex/i);
});

test('relationship copy distinguishes the personal brand from the massage business', async () => {
    const html = await read('elbow-room.html');

    assert.match(html, /The People's Elbow is Alex's personal brand/i);
    assert.match(html, /Elbow Room Massage Therapy is Alex's massage business/i);
    assert.match(html, /same licensed massage therapist/i);
    assert.doesNotMatch(html, /"@type"\s*:\s*"LocalBusiness"/i);
});

test('relationship page hands business intent to the canonical Elbow Room site', async () => {
    const html = await read('elbow-room.html');

    assert.match(html, /href="https:\/\/elbowroommassage\.com\/"/);
    assert.match(html, /href="https:\/\/elbowroommassage\.com\/book"/);
    assert.match(html, />Book with Elbow Room</i);
    assert.doesNotMatch(html, /\$\s*\d/);
    assert.doesNotMatch(html, /square\.site|appointments\/buyer\/widget/i);
});

test('relationship page is discoverable from contextual links and the sitemap', async () => {
    const [home, book, footer, sitemap] = await Promise.all([
        read('index.html'),
        read('book.html'),
        read('components/footer.html'),
        read('sitemap.xml')
    ]);

    assert.match(home, /href="elbow-room\.html"/);
    assert.match(book, /href="elbow-room\.html"/);
    assert.match(footer, /href="elbow-room\.html"/);
    assert.match(sitemap, /<loc>https:\/\/peoples-elbow\.com\/elbow-room\.html<\/loc>/);
});
