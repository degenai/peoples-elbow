import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYAML } from 'yaml';

const root = new URL('../', import.meta.url);

test('unit discovery collects every supported test suffix regardless of case', async () => {
    const { unitTests } = await import('../scripts/site-files.mjs');
    assert.deepEqual(unitTests(['js/fixture.TEST.JS','tests/fixture.spec.mjs','js/fixture.js','_deprecated/old.test.js']),['js/fixture.TEST.JS','tests/fixture.spec.mjs']);
});

test('publication retains uppercase media and preserves case-insensitive exclusions', async () => {
    const { isPublic } = await import('../scripts/site-files.mjs');
    for (const file of ['images/Fixture.PNG','Fixture.JPG','images/Fixture.SVG','promo/Fixture.PDF']) assert.equal(isPublic(file),true,file);
    for (const file of ['Woodstock-Plan.HTML','js/fixture.TEST.JS','.private/Fixture.PNG']) assert.equal(isPublic(file),false,file);
});

test('untracked publishable assets and tests cannot silently enter or escape the gate', async () => {
    const fixture = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'pe-git-boundary-'));
    const git = (...args) => execFileSync('git', args, {cwd:fixture,stdio:'ignore'});
    try {
        mkdirSync(join(fixture,'scripts'));
        writeFileSync(join(fixture,'scripts/site-files.mjs'),readFileSync(new URL('scripts/site-files.mjs',root)));
        writeFileSync(join(fixture,'index.html'),'fixture');
        git('init'); git('add','index.html','scripts/site-files.mjs');
        const { sourceFiles } = await import(pathToFileURL(join(fixture,'scripts/site-files.mjs')).href);
        assert.deepEqual(sourceFiles(),['index.html','scripts/site-files.mjs']);
        writeFileSync(join(fixture,'private-draft.html'),'synthetic fixture');
        assert.throws(() => sourceFiles(),/untracked/i);
        git('add','private-draft.html');
        assert.ok(sourceFiles().includes('private-draft.html'),'explicit staging admits the intended asset');
        writeFileSync(join(fixture,'new-case.test.mjs'),'// new regression');
        assert.throws(() => sourceFiles(),/untracked/i,'new regressions must not be silently omitted');
        git('add','new-case.test.mjs');
        assert.ok(sourceFiles().includes('new-case.test.mjs'));
    } finally { rmSync(fixture,{recursive:true,force:true}); }
});

test('uppercase artifact text still receives real syntax checks', async () => {
    const { validateFiles } = await import('../scripts/validate.mjs');
    const fixture=mkdtempSync(join(process.env.TMPDIR || tmpdir(),'pe-case-gate-'));
    try {
        const page='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title></head><body><script>const healthy = true;</script></body></html>';
        writeFileSync(join(fixture,'page.HTML'),page);
        await validateFiles(fixture,['page.HTML']);
        writeFileSync(join(fixture,'page.HTML'),page.replace('const healthy = true;','const broken = ;'));
        await assert.rejects(validateFiles(fixture,['page.HTML']),/JavaScript does not parse/);
        writeFileSync(join(fixture,'main.CSS'),'body { color: red; }');
        await validateFiles(fixture,['main.CSS']);
        writeFileSync(join(fixture,'main.CSS'),'body {');
        await assert.rejects(validateFiles(fixture,['main.CSS']));
    } finally { rmSync(fixture,{recursive:true,force:true}); }
});

test('publication selects only intentional runtime assets and every regression suite', async () => {
    const moduleURL = new URL('scripts/site-files.mjs', root);
    assert.ok(existsSync(moduleURL), 'publication needs one explicit file contract shared by the build and gate');
    const { isPublic, sourceFiles, unitTests } = await import(moduleURL.href);
    for (const file of ['index.html', 'crm.html', 'sw.js', 'js/main.js', 'js/crm/email-lead-parser.js', 'promo/gift-certs.html', 'promo/booking-sheet.pdf', 'wiki-starter-kit.zip', 'CNAME', '.nojekyll', 'manifest.webmanifest']) assert.equal(isPublic(file), true, file);
    for (const file of ['.env', '.hermes-tmp.fixture/private', 'AGENTS.md', 'test_issue.js', 'update-d1-changelog.cjs', 'workers/host-form-worker.js', 'tests/browser.py', 'package-lock.json', 'js/crm/store.test.js', 'woodstock-plan.html', 'docs/CI-LESSONS.md']) assert.equal(isPublic(file), false, file);
    const files = sourceFiles();
    const tests = unitTests(files);
    for (const file of ['js/crm/store.test.js', 'workers/host-form-worker.test.js', 'tests/publication.test.mjs']) assert.ok(tests.includes(file), file + ' must actually run');
});

test('the publication job gates the uploaded artifact and writes metadata only after deployment', () => {
    const workflow = readFileSync(new URL('.github/workflows/deploy.yml', root), 'utf8');
    const verify = workflow.indexOf('run: npm run verify');
    const upload = workflow.indexOf('uses: actions/upload-pages-artifact@');
    const deploy = workflow.indexOf('uses: actions/deploy-pages@');
    const changelog = workflow.indexOf('run: node update-d1-changelog.cjs');
    assert.ok(verify >= 0 && verify < upload, 'a complete candidate/artifact gate must precede upload; the old CRM-only test is insufficient');
    assert.ok(upload < deploy && deploy < changelog, 'metadata cannot advance before Pages succeeds');
    assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/, 'manual preview dispatch must not publish production');
    assert.match(workflow, /fetch-depth: 0/);
    assert.doesNotMatch(workflow, /Temporarily commit generated files/);
});

test('the actual artifact validator rejects a syntax-broken main script with a healthy control', async () => {
    const moduleURL = new URL('scripts/validate.mjs', root);
    assert.ok(existsSync(moduleURL), 'the deploy needs an executable artifact validator, not CRM tests alone');
    const { validateFiles } = await import(moduleURL.href);
    const fixture = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'pe-artifact-'));
    try {
        mkdirSync(join(fixture, 'js'));
        writeFileSync(join(fixture, 'js/main.js'), 'const healthy = true;');
        await validateFiles(fixture, ['js/main.js']);
        writeFileSync(join(fixture, 'js/main.js'), 'const broken = ;');
        await assert.rejects(validateFiles(fixture, ['js/main.js']), /js\/main\.js/);
    } finally {
        rmSync(fixture, { recursive: true, force: true });
    }
});
