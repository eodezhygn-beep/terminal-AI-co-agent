import assert from 'assert';
import fs from 'fs/promises';
import { readFile, writeFile, createFolder } from '../src/fs.js';
import { execShell } from '../src/terminal.js';
import { retryOperation } from '../src/retry.js';
import { compressText, findRelevantFiles } from '../src/context.js';
import { debugShell, analyzeShellFailure } from '../src/debug.js';

async function runTests() {
  const tempDir = './tests/.tmp';
  const filePath = `${tempDir}/sample.txt`;
  await createFolder(tempDir);

  await writeFile(filePath, 'hello');
  const content = await readFile(filePath);
  assert.strictEqual(content, 'hello');

  const result = await execShell('echo test');
  assert.strictEqual(result.stdout.trim(), 'test');

  const retryResult = await retryOperation(() => Promise.resolve('ok'), { retries: 1 });
  assert.strictEqual(retryResult, 'ok');

  const compressed = compressText('a'.repeat(2000), 100);
  assert.ok(compressed.length <= 110);

  const files = await findRelevantFiles('.', 'README', { maxFiles: 5, searchLimit: 50 });
  assert.ok(Array.isArray(files));

  const debugResult = await debugShell('echo debug-test', { retries: 1, ai: false });
  assert.strictEqual(debugResult.success, true);
  assert.strictEqual(debugResult.result.stdout.trim(), 'debug-test');
  assert.strictEqual(analyzeShellFailure('false', { code: 1, stdout: '', stderr: 'command failed' }).includes('exited with code'), true);

  await fs.rm(tempDir, { recursive: true, force: true });
  console.log('All tests passed.');
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
