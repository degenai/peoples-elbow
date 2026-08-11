import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

test('network page owns one aligned, indexable URL', async () => {
    const html = await read('network.html');

    assert.match(html, /<title>The Network of Residencies \| Alex Adamczyk, LMT &amp; The People's Elbow<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]*network of residencies[^"]*">/i);
    assert.match(html, /<link rel="canonical" href="https:\/\/peoples-elbow\.com\/network\.html">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/peoples-elbow\.com\/network\.html">/);
    assert.doesNotMatch(html, /noindex/i);
});

test('network copy names Alex and all three homes on equal footing', async () => {
    const html = await read('network.html');

    assert.match(html, /Alex Adamczyk, LMT/);
    assert.match(html, /Cherokee Center for Change/);
    assert.match(html, /Hustle House Health &amp; Wellness/);
    assert.match(html, /Elbow Room Massage Therapy/);
    assert.match(html, /The People's Elbow is the brand/i);
    // Equal pedestal: exactly one card per home, each with the same CTA treatment and its own route.
    const homeCards = [...html.matchAll(/<article class="network-home">([\s\S]*?)<\/article>/g)]
        .map(([, card]) => card);
    const expectedHomes = [
        ['Cherokee Center for Change', 'book.html#cherokee-center'],
        ['Hustle House Health &amp; Wellness', 'book.html'],
        ['Elbow Room Massage Therapy', 'https://elbowroommassage.com/book']
    ];

    assert.equal(homeCards.length, expectedHomes.length, 'expected exactly one card per home');
    for (const [name, href] of expectedHomes) {
        const matchingCards = homeCards.filter((card) => card.includes(`<h3>${name}</h3>`));
        assert.equal(matchingCards.length, 1, `expected exactly one network-home card for ${name}`);
        assert.ok(
            matchingCards[0].includes(`class="btn btn-primary" href="${href}"`),
            `expected ${name} to use the shared primary CTA and its own booking route`
        );
    }
});

test('network page hands business intent to the canonical Elbow Room site', async () => {
    const html = await read('network.html');

    assert.match(html, /href="https:\/\/elbowroommassage\.com\/book"/);
    assert.doesNotMatch(html, /\$\s*\d/);
    assert.doesNotMatch(html, /square\.site|appointments\/buyer\/widget/i);
});

test('network page shows the Cherokee Center for Change placeholder photos', async () => {
    const [html, room1, room2, room3] = await Promise.all([
        read('network.html'),
        read('images/ccc/room-1.jpg'),
        read('images/ccc/room-2.jpg'),
        read('images/ccc/room-3.jpg')
    ]);

    assert.match(html, /images\/ccc\/room-1\.jpg/);
    assert.match(html, /images\/ccc\/room-2\.jpg/);
    assert.match(html, /images\/ccc\/room-3\.jpg/);
    assert.ok(room1.length > 0);
    assert.ok(room2.length > 0);
    assert.ok(room3.length > 0);
});

test('network page is discoverable from contextual links and the sitemap', async () => {
    const [home, book, header, footer, sitemap] = await Promise.all([
        read('index.html'),
        read('book.html'),
        read('components/header.html'),
        read('components/footer.html'),
        read('sitemap.xml')
    ]);

    assert.match(home, /href="network\.html"/);
    assert.match(book, /href="network\.html"/);
    assert.match(header, /href="network\.html"/);
    assert.match(footer, /href="network\.html"/);
    assert.match(book, /id="cherokee-center"/);
    assert.match(sitemap, /<loc>https:\/\/peoples-elbow\.com\/network\.html<\/loc>/);
});
