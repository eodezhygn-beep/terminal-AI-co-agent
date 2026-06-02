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

export async function appendFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (dir && dir !== '.') {
    await fs.mkdir(dir, { recursive: true });
  }
  return fs.appendFile(filePath, content, 'utf8');
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function createFolder(folderPath) {
  return fs.mkdir(folderPath, { recursive: true });
}
