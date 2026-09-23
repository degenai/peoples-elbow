import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));

export function sourceFiles() {
    const list = (...args) => execFileSync('git', ['ls-files', ...args, '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
    const untracked = list('--others', '--exclude-standard');
    if (untracked.some(name => isPublic(name) || /\.(test|spec)\.(js|mjs|cjs)$/i.test(name) || /^tests\/.*\.py$/i.test(name))) {
        throw new Error('Untracked publication assets or regression tests: stage intended files or explicitly ignore private drafts before verification.');
    }
    return [...new Set(list('--cached'))].sort();
}

export function unitTests(files = sourceFiles()) {
    return files.filter(name => !name.startsWith('_deprecated/') && /\.(test|spec)\.(js|mjs|cjs)$/i.test(name));
}

const rootAssets = new Set(['CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml', '_redirects', 'sw.js', 'manifest.webmanifest', 'LICENSE', 'README.md', 'STEAL-THIS-SITE.md', 'wiki-starter-kit.zip']);
const directories = new Set(['css', 'js', 'components', 'images', 'promo', 'intake', 'intake-print', 'ccc-rate-sheet', 'fonts', 'assets']);

// Closed publication boundary: adding a new asset family is a reviewed change.
export function isPublic(name) {
    if (rootAssets.has(name)) return true;
    if (name.split('/').some(part => part.startsWith('.')) || /\.(test|spec)\./i.test(name)) return false;
    if (!name.includes('/')) return name.toLowerCase() !== 'woodstock-plan.html' && /\.(html|pdf|png|jpg|ico)$/i.test(name);
    return directories.has(name.split('/')[0]) && /\.(html|css|js|mjs|json|webmanifest|png|jpe?g|gif|webp|avif|svg|ico|pdf|woff2?|ttf|otf)$/i.test(name);
}
