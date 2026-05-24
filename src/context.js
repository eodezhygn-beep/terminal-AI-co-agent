import fs from 'fs/promises';
import path from 'path';

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build']);
const TEXT_EXTENSIONS = new Set([
  '.js', '.ts', '.json', '.md', '.markdown', '.txt', '.sh', '.py', '.yml', '.yaml', '.env', '.html', '.css'
]);

function isTextFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(extension);
}

export async function walkSourceFiles(root, options = {}) {
  const files = [];
  const maxFiles = Number(options.maxFiles ?? 500);

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || (options.exclude?.includes(entry.name))) {
        continue;
      }

      const resolved = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(resolved);
        if (files.length >= maxFiles) break;
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (isTextFile(entry.name)) {
        files.push(resolved);
      } else {
        const stat = await fs.stat(resolved);
        if (stat.size < 64 * 1024) {
          files.push(resolved);
        }
      }

      if (files.length >= maxFiles) break;
    }
  }

  await walk(root);
  return files;
}

export function extractKeywords(input) {
  if (!input || typeof input !== 'string') return [];
  const words = [...new Set(input.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [])];
  return words.slice(0, 50);
}

export async function findRelevantFiles(root, query, options = {}) {
  const keywords = extractKeywords(query);
  const maxFiles = Number(options.maxFiles ?? 10);
  const sourceFiles = await walkSourceFiles(root, { maxFiles: options.searchLimit ?? 500 });

  const scored = [];
  const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());

  for (const filePath of sourceFiles) {
    const fileName = path.basename(filePath).toLowerCase();
    let score = 0;
    let text = '';

    try {
      text = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    const lowerText = text.toLowerCase();

    for (const keyword of lowerKeywords) {
      if (fileName.includes(keyword)) score += 20;
      if (lowerText.includes(keyword)) {
        score += (lowerText.split(keyword).length - 1) * 5;
      }
    }

    if (score > 0) {
      scored.push({ filePath, score });
    }
  }

  if (scored.length === 0) {
    return sourceFiles.slice(0, maxFiles);
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map((item) => item.filePath);
}

export function compressText(text, maxLength = 1200) {
  if (typeof text !== 'string') return '';
  const normalized = text.replace(/\r\n/g, '\n');
  if (normalized.length <= maxLength) return normalized;

  const prefixLength = Math.floor(maxLength * 0.4);
  const suffixLength = Math.floor(maxLength * 0.4);
  const prefix = normalized.slice(0, prefixLength);
  const suffix = normalized.slice(normalized.length - suffixLength);

  return `${prefix}\n... [truncated] ...\n${suffix}`;
}

export async function compressFileForContext(filePath, maxLength = 1200) {
  const text = await fs.readFile(filePath, 'utf8');
  return compressText(text, maxLength);
}
