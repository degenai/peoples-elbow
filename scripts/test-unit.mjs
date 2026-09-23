import { spawnSync } from 'node:child_process';
import { ROOT, unitTests } from './site-files.mjs';
const tests = unitTests();
if (!tests.length) throw new Error('No unit tests discovered');
console.log('Running every unit suite:\n' + tests.join('\n'));
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: ROOT, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
