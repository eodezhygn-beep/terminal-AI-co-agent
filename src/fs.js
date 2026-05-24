import fs from 'fs/promises';
import path from 'path';

export async function readFile(filePath) {
  return fs.readFile(filePath, 'utf8');
}

export async function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (dir && dir !== '.') {
    await fs.mkdir(dir, { recursive: true });
  }
  return fs.writeFile(filePath, content, 'utf8');
}

export async function createFolder(folderPath) {
  return fs.mkdir(folderPath, { recursive: true });
}
