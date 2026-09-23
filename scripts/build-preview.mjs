import { readFileSync, writeFileSync, mkdirSync, rmSync, lstatSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parse, parseFragment, serialize } from 'parse5';
import { parse as parseJS } from 'acorn';
import { buildSite } from './build-site.mjs';

export const PREVIEW_CSP = "default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self'; form-action 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'";
const excluded = new Set(['sw.js','_redirects','CNAME','.nojekyll']);
const banner = '<aside id="preview-notice" role="status" style="position:relative;z-index:99999;background:#ffcc00;color:#102719;padding:12px;font:16px/1.4 system-ui;text-align:center">PREVIEW ONLY: use synthetic details. Forms are simulated in this browser. Booking, sign-in and persistent app storage are disabled. Production is unchanged.</aside>';
const add = (node, name, value) => { node.attrs = node.attrs.filter(a => a.name !== name); node.attrs.push({name,value}); };
const get = (node, name) => node.attrs?.find(a => a.name === name)?.value;

export function previewHTML(text, fragment = false) {
    const tree = fragment ? parseFragment(text) : parse(text);
    function navigates(code, type) {
        const ast=parseJS(code,{ecmaVersion:'latest',sourceType:type==='module' ? 'module' : 'script'});
        let found=false;
        function scan(node) {
            if(!node || typeof node!=='object') return;
            if(node.type==='CallExpression' && ['replace','assign'].includes(node.callee?.property?.name) && /location$/.test(code.slice(node.callee.object.start,node.callee.object.end))) found=true;
            if(node.type==='AssignmentExpression' && /(?:location|location\.href)$/.test(code.slice(node.left.start,node.left.end))) found=true;
            Object.values(node).forEach(value=>{if(Array.isArray(value)) value.forEach(scan); else if(value && typeof value==='object') scan(value);});
        }
        scan(ast); return found;
    }
    function visit(node) {
        node.childNodes=(node.childNodes || []).filter(child=>!(child.tagName==='meta' && get(child,'http-equiv')?.toLowerCase()==='refresh'));
        if (node.tagName === 'script' && ['', 'text/javascript','application/javascript','module'].includes(get(node,'type') || '')) {
            add(node,'data-preview-type',get(node,'type') || 'text/javascript');
            const code=(node.childNodes || []).map(child=>child.value || '').join('');
            add(node,'type',!get(node,'src') && navigates(code,get(node,'data-preview-type')) ? 'application/x-preview-blocked' : 'application/x-preview-script');
            if (get(node,'src')) { add(node,'data-preview-src',get(node,'src')); node.attrs=node.attrs.filter(a=>a.name!=='src'); }
        }
        if (node.tagName === 'form') {
            add(node,'action','/__preview__/disabled'); add(node,'method','post');
            const wrapper = parseFragment('<fieldset data-preview-fields disabled style="display:contents;border:0;margin:0;padding:0;min-inline-size:0"></fieldset>').childNodes[0];
            wrapper.childNodes = node.childNodes;
            wrapper.childNodes.forEach(child => {child.parentNode = wrapper;});
            wrapper.parentNode = node; node.childNodes = [wrapper];
        }
        if (node.tagName === 'a' && get(node,'href')) {
            const value = get(node,'href');
            const url = new URL(value,'https://peoples-elbow.com/');
            if (['https://peoples-elbow.com','https://www.peoples-elbow.com'].includes(url.origin)) {
                if (/^(https?:)?\/\//i.test(value)) add(node,'href',url.pathname+url.search+url.hash);
            } else add(node,'href','#preview-notice');
            node.attrs = node.attrs.filter(a => !['ping','target'].includes(a.name));
        }
        if (node.tagName === 'iframe') { add(node,'src','about:blank'); node.attrs = node.attrs.filter(a=>a.name!=='srcdoc'); }
        for (const child of [...(node.childNodes || [])]) visit(child);
        if (node.content) visit(node.content);
        const prepend = markup => {
            const nodes = parseFragment(markup).childNodes;
            nodes.forEach(child => {child.parentNode=node;}); node.childNodes.unshift(...nodes);
        };
        if (node.tagName === 'head') prepend('<meta http-equiv="Content-Security-Policy" content="'+PREVIEW_CSP.replaceAll('"','&quot;')+'"><meta name="robots" content="noindex,nofollow,noarchive"><script src="/preview-client.js"></script>');
        if (node.tagName === 'body') prepend(banner);
    }
    visit(tree); return serialize(tree);
}

export function buildPreview(candidate, output) {
    const source = realpathSync(candidate.out);
    const out = resolve(output);
    const key = value => process.platform==='win32' ? value.toLowerCase() : value;
    if (key(out) === key(source) || key(out).startsWith(key(source+sep)) || key(source).startsWith(key(out+sep))) throw new Error('Preview and source must have separate, non-overlapping directories');
    for (let path = out;;path = dirname(path)) {
        if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error('Symlink preview path');
        if (dirname(path) === path) break;
    }
    rmSync(out,{recursive:true,force:true}); mkdirSync(out,{recursive:true});
    for (const name of candidate.files) {
        if (excluded.has(name)) continue;
        const path = join(source,name);
        if (!resolve(path).startsWith(source+sep) || !lstatSync(path).isFile()) throw new Error('Invalid preview asset '+name);
        const target = join(out,name); mkdirSync(dirname(target),{recursive:true});
        const body = /\.html$/i.test(name) ? previewHTML(readFileSync(path,'utf8'),name.startsWith('components/')) : readFileSync(path);
        writeFileSync(target,body);
    }
    writeFileSync(join(out,'preview-client.js'),readFileSync(new URL('./preview-client.js',import.meta.url)));
    writeFileSync(join(out,'robots.txt'),'User-agent: *\nDisallow: /\n');
    writeFileSync(join(out,'_headers'),"/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store\n  Content-Security-Policy: "+PREVIEW_CSP+"; frame-ancestors 'none'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n");
    const files = [...candidate.files.filter(name=>!excluded.has(name)),'robots.txt','_headers','preview-client.js'].filter((v,i,a)=>a.indexOf(v)===i).sort();
    const hashes = Object.fromEntries(files.map(name=>[name,createHash('sha256').update(readFileSync(join(out,name))).digest('hex')]));
    return {out,files,hashes};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const candidate = buildSite();
    const preview = buildPreview(candidate,join(dirname(candidate.out),'_preview-site'));
    writeFileSync(join(dirname(candidate.out),'.preview/safe-manifest.json'),JSON.stringify(preview.hashes,null,2));
    console.log('Preview artifact only (no deployment): '+preview.out);
}
