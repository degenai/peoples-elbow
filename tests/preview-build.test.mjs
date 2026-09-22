import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

test('Windows case aliases cannot overwrite the source artifact',{skip:process.platform!=='win32'},async()=>{
    const { buildPreview }=await import('../scripts/build-preview.mjs');
    const root=mkdtempSync(join(process.env.TMPDIR || tmpdir(),'pe-case-alias-'));
    try {
        writeFileSync(join(root,'index.html'),'fixture');
        assert.throws(()=>buildPreview({out:root,files:['index.html']},root.toUpperCase()),/separate|overlap/i);
        assert.equal(readFileSync(join(root,'index.html'),'utf8'),'fixture');
    } finally {rmSync(root,{recursive:true,force:true});}
});

test('classic inline scripts keep classic parsing semantics in preview',async()=>{
    const { previewHTML }=await import('../scripts/build-preview.mjs');
    assert.doesNotThrow(()=>previewHTML('<script>with({fixture:1}){void fixture}</script>'));
});

test('product scripts cannot execute until the preview safety bootstrap activates them', async () => {
    const { previewHTML } = await import('../scripts/build-preview.mjs');
    const text = previewHTML('<html><head><script src="/js/main.js"></script><script>localStorage.setItem("fixture","x")</script></head><body></body></html>');
    assert.match(text, /type="application\/x-preview-script"/);
    assert.doesNotMatch(text, /<script src="\/js\/main.js"/);
    assert.ok(text.indexOf('Content-Security-Policy') < text.indexOf('src="\/preview-client.js"'));
});

// The preview consumes only the sealed production artifact, never a repository copy.
test('preview output is separate, visibly marked and native forms are inert before JavaScript', async () => {
    const moduleURL = new URL('../scripts/build-preview.mjs', import.meta.url);
    assert.ok(existsSync(moduleURL), 'repository-owned safe preview builder is missing');
    const { buildPreview } = await import(moduleURL.href);
    const fixture = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'pe-preview-build-'));
    try {
        const source = join(fixture, 'source'); mkdirSync(source);
        const original = '<!doctype html><html lang="en"><head><title>Fixture</title></head><body><form action="https://external.invalid/" method="get"><input name="email"><button type="submit">Send</button></form><a href="https://squareup.com/">Book</a><a href="https://peoples-elbow.com/book.html">Internal</a></body></html>';
        writeFileSync(join(source, 'index.html'), original);
        const result = buildPreview({out:source,files:['index.html']},join(fixture,'preview'));
        const html = readFileSync(join(result.out,'index.html'),'utf8');
        assert.match(html, /PREVIEW ONLY/);
        assert.match(html, /form-action 'none'/);
        assert.match(html, /data-preview-fields[^>]*disabled/);
        assert.match(html, /href="#preview-notice"/);
        assert.match(html, /href="\/book.html"/);
        assert.doesNotMatch(html, /action="https:/);
        assert.equal(readFileSync(join(source,'index.html'),'utf8'),original);
        assert.throws(() => buildPreview({out:source,files:['index.html']},source),/separate|overlap/i);
    } finally { rmSync(fixture,{recursive:true,force:true}); }
});
