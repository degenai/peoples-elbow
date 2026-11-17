import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceFiles, isPublic } from '../scripts/site-files.mjs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('paper form clearly requests handwriting and provides provider and weeks writing lines', () => {
    const intake = read('intake-print/index.html');
    assert.match(intake, /Print and complete by hand/);
    assert.match(intake, /Chiropractic provider name<\/label><div class="fill">/);
    assert.match(intake, /weeks: <span class="fill fill-inline"/);
});

test('the session rate sheet keeps its first-visit intro row and prices', () => {
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

test('booking page sends paid sessions to Elbow Room at exactly two places, Monday off', () => {
    const book = read('book.html');
    const chips = [...book.matchAll(/class="day-chip ([^"]+)" data-days="([^"]+)"/g)].map(m => [m[1], m[2]]);
    assert.deepEqual(chips, [['chip-ccc', '2,4,5'], ['chip-hh', '3,6,0'], ['chip-off', '1']]);
    assert.equal(book.match(/<article class="venue-card /g).length, 2);
    const buttons = [...book.matchAll(/class="btn btn-primary venue-card-cta" href="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(buttons, ['tel:+17709287300', 'https://elbowroommassage.com/book'], 'one button per place');
    assert.match(book, /409 Old Boring Lane, Woodstock/);
    assert.match(book, /111 Mirramont Lake Dr, Woodstock/);
    assert.match(book, /href="tel:\+17705992552">\(770\) 599-2552</);
});

test('booking page names no retired venue, embeds no second calendar and carries no prices to drift', () => {
    const book = read('book.html');
    assert.doesNotMatch(book, /Stauffer|chiropractic|Towne Lake|4595|470[-.) ]*702|three venues|select Sat|Residency Network/i);
    assert.doesNotMatch(book, /square\.site|squareup\.com|<iframe/i, 'Hustle House books on elbowroommassage.com/book, the one booking page');
    assert.doesNotMatch(book, /\$\d/, 'prices live on the Elbow Room booking page only');
    assert.doesNotMatch(book, /\btext(s|ing|ed)?\b/i, 'the Elbow Room line takes calls only, day notes included');
    assert.doesNotMatch(read('promo/gift-certs.html'), /select Sat/i, 'gift certificates point at the booking page, not retired days');
    assert.doesNotMatch(read('css/main.css'), /Residency Network/);
});

// Visible text only: drop embedded images, tags and the few entities these pages use.
const visible = html => html.replace(/data:[^"']+/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
// What a page claims today: visible text plus meta and social preview text, without comments
// or the dated past-event entries (Alex 2026-11-17: past events stay as written).
const current = html => {
    const page = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<article class="past-event">[\s\S]*?<\/article>/g, '');
    const meta = [...page.matchAll(/<meta\s[^>]*content="([^"]*)"/g)].map(m => m[1]).join(' . ');
    return visible(page + ' . ' + meta);
};
// Visible text of the first element whose opening tag contains `marker`, nested children included.
const element = (html, marker) => {
    assert.ok(html.indexOf(marker) > 0, 'missing ' + marker);
    const start = html.lastIndexOf('<', html.indexOf(marker));
    const name = html.slice(start + 1).match(/^\w+/)[0];
    const tags = new RegExp('<(/?)' + name + '\\b[^>]*>', 'g');
    tags.lastIndex = start;
    for (let depth = 0, m; (m = tags.exec(html));) {
        depth += m[1] ? -1 : 1;
        if (!depth) return visible(html.slice(start, tags.lastIndex));
    }
    throw new Error('unclosed ' + marker);
};
// Hustle House and all three of its days in one sentence.
const HH_DAYS = /Hustle House[^.]*\bWed[^.]*\bSat[^.]*\bSun|\bWed[^.]*\bSat[^.]*\bSun[^.]*Hustle House/;

test('The People\'s Elbow is described as fundraising and mutual aid, never as free', () => {
    const book = read('book.html');
    const about = book.split('class="book-about-body">')[1].split('</p>')[0];
    assert.match(about, /fundraising/);
    assert.match(about, /mutual aid/);
    assert.match(about, /separate from Elbow Room Massage/);
    assert.doesNotMatch(book, /\bfree\b/i, 'Alex 2026-11-17: it is fundraising and mutual aid, not free');
});

const HUSTLE_PAGES = ['index.html', 'calendar.html', 'past-events.html', 'book.html', 'promo/free-chair-flyer.html', 'promo/green-card-fedex.html', 'promo/green-cards-10up.html', 'promo/gift-certs.html'];

test('Hustle House is Wednesday, Saturday and Sunday everywhere, never Wednesdays only', () => {
    for (const name of HUSTLE_PAGES) {
        const text = current(read(name));
        assert.doesNotMatch(text, /\bWednesdays\b|every Wednesday\b(?![,\s]+Saturday)/i, name + ' still says Wednesdays only');
        assert.match(text, /Hustle House/, name);
        assert.match(text, /\bSat(urday)?\b/, name + ' names Saturday');
        assert.match(text, /\bSun(day)?\b/, name + ' names Sunday');
    }
});

test('the home page books paid Hustle House sessions through Elbow Room, not The People\'s Elbow', () => {
    const home = read('index.html');
    assert.doesNotMatch(home, /People's Elbow at Hustle House/i);
    const section = home.split('id="hustle-house"')[1].split('</section>')[0];
    assert.match(section, /Elbow Room Massage at Hustle House/);
    assert.match(section, /href="(https:\/\/elbowroommassage\.com\/book|book\.html)"/);
    assert.match(section, /Wed, Sat, Sun/);
});

test('print cards and flyers point at Elbow Room at Hustle House, never Sundays at the old Elbow Room room', () => {
    for (const name of ['promo/free-chair-flyer.html', 'promo/green-card-fedex.html', 'promo/green-cards-10up.html', 'promo/gift-certs.html', 'promo/index.html']) {
        const text = visible(read(name));
        assert.doesNotMatch(text, /Sundays?\s*(at|·|—|-)\s*Elbow Room/i, name);
        assert.doesNotMatch(text, /Elbow Room[^.]{0,40}\bSundays\b/i, name);
    }
    const cards = { 'promo/free-chair-flyer.html': 1, 'promo/green-card-fedex.html': 1, 'promo/green-cards-10up.html': 10 };
    for (const [name, count] of Object.entries(cards)) {
        const html = read(name);
        assert.equal(html.match(/elbowroommassage\.com\/book/gi)?.length, count, name + ': one booking line per card');
        assert.equal(visible(html).match(/Elbow Room Massage at Hustle House|Hustle House\s+Booked through Elbow Room Massage/g)?.length, count, name);
        assert.doesNotMatch(html, /BOOK: peoples-elbow\.com/i, name);
    }
});

test('every gift certificate and coupon books at Hustle House on elbowroommassage.com/book and keeps its value and expiry', () => {
    const html = read('promo/gift-certs.html');
    const blocks = html.split(/<div class="(?=cert"|coupon"|pcoupon")/).slice(1).map(visible);
    assert.equal(blocks.length, 10, 'two certificates, four Elbow Room coupons, four People\'s Elbow coupons');
    for (const [i, block] of blocks.entries()) {
        assert.match(block, /Hustle House/, 'block ' + i);
        assert.match(block, /Wednesday, Saturday or Sunday/, 'block ' + i);
        assert.match(block, /elbowroommassage\.com\/book/i, 'block ' + i);
        assert.match(block, /Bring this (certificate|coupon) to your appointment/, 'block ' + i);
        assert.match(block, /January 31, 2027/, 'block ' + i);
        assert.doesNotMatch(block, /Wednesdays|peoples-elbow\.com\/book|mention this/i, 'block ' + i);
    }
    assert.equal(blocks.filter(b => /60-Minute Massage/.test(b)).length, 2);
    assert.equal(blocks.filter(b => /30-Minute Massage|30-MINUTE MASSAGE/.test(b)).length, 8);
    assert.match(html, /Dr\. Jen 10-Year Anniversary/, 'the certificate title stays');
});

test('each current Hustle House line names Wednesday, Saturday and Sunday in the same sentence', () => {
    const lines = {
        'index.html': ['id="home-book-availability"', 'class="hh-kicker"', 'class="countdown-residency"', 'class="map-coming-soon"'],
        'calendar.html': ['href="book.html" class="calendar-hub-card"'],
        'past-events.html': ['class="book-banner-sub"'],
        'book.html': ['id="day-strip-note"', 'id="gift-holders"'],
        'promo/free-chair-flyer.html': ['class="how"'],
    };
    for (const [name, markers] of Object.entries(lines)) {
        const html = read(name);
        for (const marker of markers) assert.match(element(html, marker), HH_DAYS, name + ' ' + marker);
    }
    for (const [name, count] of [['promo/green-card-fedex.html', 1], ['promo/green-cards-10up.html', 10]]) {
        const backs = read(name).split('<div class="back page">').slice(1).map(back => element('<div class="back page">' + back, 'class="back page"'));
        assert.equal(backs.length, count, name);
        for (const back of backs) assert.match(back, HH_DAYS, name);
    }
    const shelf = read('promo/index.html');
    assert.doesNotMatch(current(shelf), /Wednesday/i, 'the promo shelf names no Wednesday-only art');
    for (const art of ['pe-hustle-house-story.png', 'hustle-house-flyer.png', 'hustle-house-flyer-1up.pdf', 'hustle-house-flyer-4up.pdf']) {
        assert.ok(!shelf.includes('href="' + art + '"'), art + ' says Every Wednesday under The People\'s Elbow; keep it off the shelf until it is redrawn');
    }
});

test('no current page points anyone to Sundays at the old Elbow Room room', () => {
    for (const name of HUSTLE_PAGES) {
        const text = current(read(name));
        assert.doesNotMatch(text, /Sundays?\s*(at|·|—|-)\s*Elbow Room/i, name);
        assert.doesNotMatch(text, /Elbow Room[^.]{0,40}\bSundays\b/i, name);
    }
});

test('the Elbow Room line takes calls only on every public page', () => {
    for (const name of sourceFiles().filter(file => isPublic(file) && file.endsWith('.html'))) {
        const text = visible(read(name));
        for (const m of text.matchAll(/599[-. ]?2552|5992552/g)) {
            assert.doesNotMatch(text.slice(Math.max(0, m.index - 80), m.index + 90), /\btext(s|ing|ed)?\b/i, name);
        }
    }
});

test('paid sessions are Elbow Room\'s in every current booking line, never The People\'s Elbow\'s', () => {
    const home = read('index.html');
    const lines = [
        element(read('past-events.html'), 'class="book-banner-sub"'),
        element(home.split('id="hustle-house"')[1], 'class="btn btn-primary"'),
        element(read('book.html'), 'class="book-about-body"'),
        element(home, 'class="hero-offer-ribbon"'),
    ];
    for (const line of lines) {
        assert.match(line, /Elbow Room/, line);
        assert.doesNotMatch(line, /(with|through|at) The People's Elbow/i, line);
    }
    assert.match(lines[2], /Paid sessions are booked and paid through Elbow Room/);
    const ld = JSON.parse(home.split('<script type="application/ld+json">')[1].split('</script>')[0]);
    assert.notEqual(ld['@type'], 'LocalBusiness', 'The People\'s Elbow is a personal project, not the paid practice');
    assert.equal(ld.priceRange, undefined);
    assert.match(ld.description, /fundraising and mutual aid/);
    assert.match(ld.description, /booked through Elbow Room Massage/);
    const meta = [...home.matchAll(/<meta (?:name|property)="(?:description|og:description|twitter:description)" content="([^"]*)"/g)].map(m => m[1]);
    assert.equal(meta.length, 3);
    for (const text of meta) assert.match(text, /booked through Elbow Room Massage/);
});

test('gift certificate holders are sent to Hustle House on the booking page (Alex 2026-11-17)', () => {
    const line = element(read('book.html'), 'id="gift-holders"');
    assert.match(line, /Elbow Room gift certificate/);
    assert.match(line, /Hustle House on a Wednesday, Saturday or Sunday/);
    assert.match(line, /elbowroommassage\.com\/book/);
    assert.match(line, /bring it to your appointment/);
});
