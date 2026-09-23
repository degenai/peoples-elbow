import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { ROOT, sourceFiles } from './site-files.mjs';
import { buildSite } from './build-site.mjs';
import { buildPreview } from './build-preview.mjs';
import { validateFiles, validateReferences, walk } from './validate.mjs';

function run(command, args, env = process.env) {
    const result = spawnSync(command, args, { cwd: ROOT, env, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(command + ' ' + args.join(' ') + ' failed: ' + result.status);
}

// This is the same fail-closed command used in PR CI and before Pages upload.
await validateFiles(ROOT, sourceFiles());
run(process.execPath, ['scripts/test-unit.mjs']);
const candidate = buildSite();
await validateFiles(candidate.out, candidate.files);
console.log('Validated ' + await validateReferences(candidate.out, candidate.files) + ' artifact references.');
run(process.env.PE_TEST_PYTHON || 'python', ['-B', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'browser*.py', '-v'], { ...process.env, PE_SITE_DIR: candidate.out });
assert.deepEqual(walk(candidate.out), candidate.files, 'The tested artifact file set changed');
for (const [name, hash] of Object.entries(candidate.hashes)) {
    assert.equal(createHash('sha256').update(readFileSync(join(candidate.out, name))).digest('hex'), hash, 'Tested artifact changed: ' + name);
}
const preview = buildPreview(candidate, join(ROOT,'_preview-site'));
await validateFiles(preview.out,preview.files);
await validateReferences(preview.out,preview.files);
run(process.env.PE_TEST_PYTHON || 'python', ['-B','-m','unittest','discover','-s','tests','-p','preview_browser.py','-v'], {...process.env,PE_SITE_DIR:preview.out});
run(process.env.PE_TEST_PYTHON || 'python', ['-B','-m','unittest','discover','-s','tests','-p','browser_surface.py','-v'], {...process.env,PE_SITE_DIR:preview.out});
assert.deepEqual(walk(preview.out),preview.files,'Preview file set changed');
for(const [name,hash] of Object.entries(preview.hashes)) assert.equal(createHash('sha256').update(readFileSync(join(preview.out,name))).digest('hex'),hash,'Preview changed: '+name);
writeFileSync(join(ROOT,'.preview/safe-manifest.json'),JSON.stringify(preview.hashes,null,2));
console.log('VERIFIED: source parse, all unit suites, artifact references, production and safe-preview browser regressions, unchanged artifact hashes.');
console.log('No deployment, email, booking or changelog write was performed.');
