import assert from 'assert';
import { readFile, writeFile, createFolder } from '../src/fs.js';
import { execShell } from '../src/terminal.js';
import fs from 'fs/promises';

async function runTests() {
  const tempDir = './tests/.tmp';
  const filePath = `${tempDir}/sample.txt`;
  await createFolder(tempDir);

  await writeFile(filePath, 'hello');
  const content = await readFile(filePath);
  assert.strictEqual(content, 'hello');

  const result = await execShell('echo test');
  assert.strictEqual(result.stdout.trim(), 'test');

  await fs.rm(tempDir, { recursive: true, force: true });
  console.log('All tests passed.');
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
