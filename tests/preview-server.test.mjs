import test from 'node:test';
import { get } from 'node:http';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('loopback preview serves immutable manifest assets and rejects writes, unknown paths and hosts',async()=>{
    const moduleURL=new URL('../scripts/serve-preview.mjs',import.meta.url);
    assert.ok(existsSync(moduleURL),'manifest-backed preview launcher is missing');
    const { createPreviewServer }=await import(moduleURL.href);
    const root=mkdtempSync(join(process.env.TMPDIR || tmpdir(),'pe-preview-server-'));
    const content='<!doctype html><title>PREVIEW ONLY</title>';
    writeFileSync(join(root,'index.html'),content);
    writeFileSync(join(root,'unlisted.txt'),'not a preview asset');
    const manifest={'index.html':createHash('sha256').update(content).digest('hex')};
    const server=createPreviewServer(root,manifest);
    try {
        await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
        const url='http://127.0.0.1:'+server.address().port;
        let response=await fetch(url);
        assert.equal(response.status,200); assert.equal(await response.text(),content);
        assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
        assert.match(response.headers.get('Content-Security-Policy'),/form-action 'none'/);
        for(const path of ['/package.json','/unlisted.txt','/sw.js','/%2eprivate','/missing/']) assert.equal((await fetch(url+path)).status,404,path);
        assert.equal((await fetch(url,{method:'POST',body:'SYNTHETIC_ONLY'})).status,405);
        const hostStatus=await new Promise((resolve,reject)=>{get(url,{headers:{Host:'wrong.invalid'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));}).on('error',reject);});
        assert.equal(hostStatus,421);
        writeFileSync(join(root,'index.html'),'changed on disk');
        assert.equal(await (await fetch(url)).text(),content,'server must keep sealed in-memory bytes');
        assert.throws(()=>createPreviewServer(root,manifest),/drift/i);
    } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));rmSync(root,{recursive:true,force:true});}
});
