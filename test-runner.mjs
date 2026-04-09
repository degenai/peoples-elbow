import { spawn } from 'node:child_process';
import { globSync } from 'node:fs';

const testFiles = globSync(['workers/*.test.js', 'js/**/*.test.js', '*.test.js']);

async function runTest(file) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning tests in ${file}`);
    let args = ['--test', file];

    // Add mock loader for files that need cloudflare:email
    if (file === 'workers/host-form-worker.test.js') {
      args = ['--experimental-loader', './workers/mock-loader.js', ...args];
    }

    const child = spawn('node', args, { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test failed: ${file}`));
      }
    });
  });
}

async function runAll() {
  for (const file of testFiles) {
    await runTest(file);
  }
  console.log('\nAll tests passed! 🎉');
}

runAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
