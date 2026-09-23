import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { HtmlValidate } from 'html-validate';
import stylelint from 'stylelint';
import { parse } from 'parse5';
import { parse as parseJS } from 'acorn';

const configRoot = fileURLToPath(new URL('../', import.meta.url));
const html = new HtmlValidate(JSON.parse(readFileSync(join(configRoot, '.htmlvalidate.json'), 'utf8')));
const cssConfig = JSON.parse(readFileSync(join(configRoot, '.stylelintrc.json'), 'utf8'));

export function walk(root, prefix = '') {
    return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap(entry => {
        const name = prefix + entry.name;
        if (entry.isSymbolicLink()) throw new Error('Symlink not allowed in artifact: ' + name);
        return entry.isDirectory() ? walk(root, name + '/') : [name];
    }).sort();
}

function checkJS(code, name, module = false) {
    const args = ['--check', ...(module ? ['--input-type=module'] : [])];
    const result = spawnSync(process.execPath, args, { input: code, encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(name + ': JavaScript does not parse\n' + (result.error || result.stderr));
}

async function checkCSS(code, name) {
    const result = await stylelint.lint({ code, codeFilename: name + '.css', config: cssConfig });
    if (result.errored) throw new Error(name + ': CSS does not parse\n' + JSON.stringify(result.results));
}

export async function validateReferences(root, names) {
    const available = new Set(names);
    const origin = 'https://peoples-elbow.com';
    let checked = 0;
    let precache = null;
    const staticImports = new Map();
    function requireAsset(value, from) {
        if (!value || value.startsWith('#')) return;
        // Shared HTML fragments are mounted by components.js into root-level pages.
        const documentPath = from.startsWith('components/') && /\.html$/i.test(from) ? 'index.html' : from;
        const target = new URL(value, origin + '/' + documentPath);
        if (target.origin !== origin) return;
        let name;
        try { name = decodeURIComponent(target.pathname).replace(/^\//, ''); }
        catch { throw new Error(from + ': invalid local URL ' + value); }
        const variants = name.endsWith('/') || !name ? [name + 'index.html'] : [name, name + '.html', name + '/index.html'];
        const found = variants.find(file => available.has(file));
        if (!found) throw new Error(from + ': missing artifact reference ' + value);
        checked++;
        return found;
    }
    function cssAssets(code, name) {
        const text = code.replace(/\/\*[\s\S]*?\*\//g, '');
        for (const match of text.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) requireAsset(match[2], name);
        for (const match of text.matchAll(/@import\s+['"]([^'"]+)['"]/gi)) requireAsset(match[1], name);
    }
    function moduleAssets(code, name) {
        function visit(node) {
            if (!node || typeof node !== 'object') return;
            if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type) && typeof node.source?.value === 'string') {
                const value = node.source.value;
                if (/^(\.|\/|https?:)/.test(value)) {
                    const resolved = requireAsset(value, name);
                    if (resolved && node.type !== 'ImportExpression') staticImports.set(name, [...(staticImports.get(name) || []), resolved]);
                }
            }
            for (const child of Object.values(node)) {
                if (Array.isArray(child)) child.forEach(visit);
                else if (child && typeof child === 'object') visit(child);
            }
        }
        const ast = parseJS(code, { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true });
        if (name === 'sw.js') {
            const declaration = ast.body.filter(node => node.type === 'VariableDeclaration').flatMap(node => node.declarations).find(node => node.id.name === 'PRECACHE_URLS');
            if (declaration) {
                if (declaration.init?.type !== 'ArrayExpression' || declaration.init.elements.some(node => node?.type !== 'Literal' || typeof node.value !== 'string')) throw new Error('sw.js: precache must be a verifiable static URL list');
                precache = new Set(declaration.init.elements.map(node => requireAsset(node.value, name)));
                if (precache.has(undefined)) throw new Error('sw.js: precache entries must be same-origin artifact assets');
                if (precache.size !== declaration.init.elements.length) throw new Error('sw.js: duplicate precache entries');
            }
        }
        visit(ast);
    }
    for (const name of names.filter(file => /\.(css|js|mjs)$/i.test(file))) {
        const text = readFileSync(join(root, name), 'utf8');
        if (/\.css$/i.test(name)) cssAssets(text, name);
        else moduleAssets(text, name);
    }
    for (const name of names.filter(file => /\.html$/i.test(file))) {
        function visit(node) {
            const attrs = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
            if (['a', 'link'].includes(node.tagName) && !['canonical', 'alternate'].includes(attrs.rel)) requireAsset(attrs.href, name);
            if (['img', 'script', 'iframe', 'source', 'video', 'audio', 'track', 'embed', 'input'].includes(node.tagName)) requireAsset(attrs.src, name);
            if (node.tagName === 'video') requireAsset(attrs.poster, name);
            if (attrs.style) cssAssets(attrs.style, name);
            const text = (node.childNodes || []).map(child => child.value || '').join('');
            if (node.tagName === 'style') cssAssets(text, name);
            if (node.tagName === 'script' && attrs.type === 'module' && !attrs.src) moduleAssets(text, name);
            for (const child of node.childNodes || []) visit(child);
            if (node.content) visit(node.content);
        }
        visit(parse(readFileSync(join(root, name), 'utf8')));
    }
    if (precache) {
        for (const file of precache) for (const dependency of staticImports.get(file) || []) {
            if (!precache.has(dependency)) throw new Error('sw.js: precache omits static dependency ' + dependency + ' required by ' + file);
        }
    }
    return checked;
}

export async function validateFiles(root, names) {
    for (const name of names) {
        if (name.startsWith('_deprecated/') || name.includes('/vendor/') || /\.min\.(js|css)$/.test(name)) continue;
        const path = join(root, name);
        const lowerName = name.toLowerCase();
        if (/\.(js|mjs|cjs)$/.test(lowerName)) {
            const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
            if (result.error || result.status !== 0) throw new Error(name + ': JavaScript does not parse\n' + (result.error || result.stderr));
        } else if (lowerName.endsWith('.css')) {
            await checkCSS(readFileSync(path, 'utf8'), name);
        } else if (lowerName.endsWith('.html')) {
            const text = readFileSync(path, 'utf8');
            const report = await html.validateString(text, name);
            if (!report.valid) throw new Error(name + ': HTML structure failed\n' + JSON.stringify(report.results));
            async function inline(node) {
                const attr = key => node.attrs?.find(a => a.name === key)?.value;
                const code = (node.childNodes || []).map(c => c.value || '').join('');
                if (node.tagName === 'script' && attr('src') === undefined) {
                    const type = (attr('type') || 'text/javascript').toLowerCase();
                    if (['text/javascript', 'application/javascript', 'module'].includes(type)) checkJS(code, name + ' inline script', type === 'module');
                    else if (type === 'application/ld+json' || type === 'application/json') JSON.parse(code);
                }
                if (node.tagName === 'style') await checkCSS(code, name + ' inline style');
                for (const child of node.childNodes || []) await inline(child);
                if (node.content) await inline(node.content);
            }
            await inline(parse(text));
        }
    }
    return names.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = resolve(process.argv[2] || '_site');
    await validateFiles(root, walk(root));
    const checked = await validateReferences(root, walk(root));
    console.log('Artifact parse and reference checks passed: ' + root + ' (' + checked + ' references)');
}
