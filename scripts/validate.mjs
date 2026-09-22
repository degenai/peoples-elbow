import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { HtmlValidate } from 'html-validate';
import stylelint from 'stylelint';
import { parse } from 'parse5';

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
    console.log('Artifact parse checks passed: ' + root);
}
