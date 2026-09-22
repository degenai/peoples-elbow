import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateReferences, walk } from '../scripts/validate.mjs';

function fixture(files) {
    const root = mkdtempSync(join(tmpdir(), 'pe-refs-'));
    for (const [name, body] of Object.entries(files)) {
        mkdirSync(join(root, name, '..'), { recursive: true });
        writeFileSync(join(root, name), body);
    }
    return root;
}

test('artifact CLI fails on a missing asset, not only syntax failures', () => {
    const root = fixture({'index.html':'<!doctype html><html lang="en"><head><title>Fixture</title></head><body><img src="lost.png" alt="Missing asset"></body></html>'});
    try {
        const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/validate.mjs', import.meta.url)), root], {encoding:'utf8'});
        assert.notEqual(result.status, 0, 'a missing image must block publication');
        assert.match(result.stderr, /missing artifact reference lost.png/);
    } finally { rmSync(root,{recursive:true,force:true}); }
});

test('shared component URLs resolve in the root document where the loader mounts them', async () => {
    const root = fixture({'index.html':'fixture','components/footer.html':'<img src="images/logo.png"><a href="book.html">Book</a>','images/logo.png':'fixture','book.html':'fixture'});
    try { await assert.doesNotReject(validateReferences(root, walk(root))); }
    finally { rmSync(root,{recursive:true,force:true}); }
});

test('precache entries must exist in the artifact and include static module dependencies', async () => {
    const root = fixture({'index.html':'fixture','sw.js':"const PRECACHE_URLS = ['js/app.js'];",'js/app.js':"import './dep.js';",'js/dep.js':'export const ready=true;'});
    try {
        await assert.rejects(validateReferences(root, walk(root)), /precache.*js\/dep.js/i);
        writeFileSync(join(root,'sw.js'),"const PRECACHE_URLS = ['js/app.js', 'js/dep.js'];");
        await validateReferences(root, walk(root));
        writeFileSync(join(root,'sw.js'),"const PRECACHE_URLS = ['js/app.js', 'js/dep.js', 'missing.html'];");
        await assert.rejects(validateReferences(root, walk(root)), /sw.js.*missing.html/);
    } finally { rmSync(root,{recursive:true,force:true}); }
});

test('relative stylesheet assets and actual module imports must exist; comments are not imports', async () => {
    const root = fixture({
        'index.html': '<script src="js/app.js"></script><link rel="stylesheet" href="css/main.css">',
        'js/app.js': "import './dep.js'; // import './not-real.js';\nconst text = \"import './also-not-real.js'\";",
        'js/dep.js': 'export const ready = true;',
        'css/main.css': 'body { background: url(../images/bg.PNG); }',
        'images/bg.PNG': 'synthetic-image',
    });
    try {
        await validateReferences(root, walk(root));
        unlinkSync(join(root, 'js/dep.js'));
        await assert.rejects(validateReferences(root, walk(root)), /js\/app.js.*dep.js/);
        writeFileSync(join(root, 'js/dep.js'), 'export const ready = true;');
        unlinkSync(join(root, 'images/bg.PNG'));
        await assert.rejects(validateReferences(root, walk(root)), /css\/main.css.*bg.PNG/);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a missing referenced image fails artifact verification instead of shipping a 404', async () => {
    const root = fixture({
        'index.html': '<link rel="canonical" href="https://elsewhere.invalid/"><a href="/about?from=home#top">About</a><img src="/images/Photo.PNG">',
        'about.html': '<a href="https://external.invalid/">External</a><a href="#top">Top</a>',
        'images/Photo.PNG': 'synthetic-image',
    });
    try {
        await validateReferences(root, walk(root));
        unlinkSync(join(root, 'images/Photo.PNG'));
        await assert.rejects(validateReferences(root, walk(root)), /index.html.*images\/Photo.PNG/);
    } finally { rmSync(root, { recursive: true, force: true }); }
});
