import { copyFileSync, mkdirSync, rmSync, lstatSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { ROOT, sourceFiles, isPublic } from './site-files.mjs';

export function buildSite() {
    const out = join(ROOT, '_site');
    if (existsSync(out) && lstatSync(out).isSymbolicLink()) throw new Error('Refusing symlink artifact directory');
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const files = sourceFiles().filter(isPublic);
    if (!files.includes('index.html') || !files.includes('crm.html') || !files.includes('sw.js')) throw new Error('Required public entry missing');
    const hashes = {};
    for (const name of files) {
        const source = join(ROOT, name);
        if (!lstatSync(source).isFile()) throw new Error('Only regular files can be published: ' + name);
        const target = join(out, name);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(source, target);
        hashes[name] = createHash('sha256').update(readFileSync(target)).digest('hex');
    }
    mkdirSync(join(ROOT, '.preview'), { recursive: true });
    writeFileSync(join(ROOT, '.preview/publish-manifest.json'), JSON.stringify(hashes, null, 2));
    console.log('Assembled ' + files.length + ' public files; helpers and private material excluded.');
    return { out, files, hashes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildSite();
