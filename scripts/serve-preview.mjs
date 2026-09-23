import { createServer } from 'node:http';
import { readFileSync, realpathSync, lstatSync } from 'node:fs';
import { resolve, join, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PREVIEW_CSP } from './build-preview.mjs';

export function createPreviewServer(directory, manifest) {
    const root=realpathSync(directory);
    const assets=new Map(Object.entries(manifest).map(([name,hash])=>{
        const path=join(root,name);
        if(!resolve(path).startsWith(root+sep) || !lstatSync(path).isFile() || !realpathSync(path).startsWith(root+sep)) throw new Error('Invalid preview asset');
        const body=readFileSync(path);
        if(createHash('sha256').update(body).digest('hex')!==hash) throw new Error('Preview artifact drift: '+name);
        return [name,body];
    }));
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.webp':'image/webp','.pdf':'application/pdf','.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
    const server=createServer((request,response)=>{
        function reply(status,body,kind='text/plain; charset=utf-8') {
            response.writeHead(status,{'Content-Type':kind,'Content-Length':Buffer.byteLength(body),'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'no-store','Content-Security-Policy':PREVIEW_CSP+"; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Connection':'close'});
            response.end(request.method==='HEAD' ? undefined : body);
        }
        if(!['127.0.0.1:'+server.address().port,'localhost:'+server.address().port].includes(request.headers.host)) return reply(421,'Unexpected Host');
        if(!['GET','HEAD'].includes(request.method)) return reply(405,'Preview writes disabled');
        let path;
        try {path=decodeURIComponent(new URL(request.url,'http://localhost').pathname).slice(1);} catch {return reply(404,'Not a preview asset');}
        if(path.includes('\\') || path.includes(':') || path.split('/').some(p=>p.startsWith('.')) || path==='_headers') return reply(404,'Not a preview asset');
        const names=path.endsWith('/') || !path ? [path+'index.html'] : [path,path+'.html',path+'/index.html'];
        const name=names.find(name=>assets.has(name));
        if(!name) return reply(404,'Not a preview asset');
        return reply(200,assets.get(name),types[extname(name).toLowerCase()] || 'application/octet-stream');
    });
    server.requestTimeout=5000; server.headersTimeout=5000;
    return server;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
    const root=resolve(process.argv[2] || '_preview-site');
    const manifest=JSON.parse(readFileSync(resolve(process.argv[3] || '.preview/safe-manifest.json'),'utf8'));
    const port=Number(process.argv[4] || 8780);
    const server=createPreviewServer(root,manifest);
    server.listen(port,'127.0.0.1',()=>console.log('Safe loopback preview: http://127.0.0.1:'+server.address().port));
}
