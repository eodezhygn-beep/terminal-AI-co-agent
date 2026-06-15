export function validateFileWrite({ path: filePath, content, projectContext = {} }) {
  const warnings = [];
  const normalizedPath = (filePath || '').replace(/\\\\/g, '/');

  if (!normalizedPath || normalizedPath.startsWith('/') || normalizedPath.includes('..')) {
    warnings.push(`Path appears unsafe or invalid: ${filePath}`);
  }

  if (!content || !content.trim()) {
    warnings.push(`Generated content for ${filePath} is empty or whitespace.`);
    return { valid: false, warnings };
  }

  if (/\.tsx?$/.test(normalizedPath)) {
    if (!/import\s+React|export\s+default|function\s+[A-Z]/.test(content) && normalizedPath.endsWith('.tsx')) {
      warnings.push(`React/TSX file ${filePath} may not contain expected React patterns.`);
    }
    if (normalizedPath.includes('/features/auth/') && !/tailwind|className=/.test(content)) {
      warnings.push(`Expected Tailwind styling in auth feature file ${filePath}.`);
    }
  }

  if (normalizedPath.endsWith('/auth/login.ts')) {
    if (!/export\s+async\s+function\s+login/.test(content)) {
      warnings.push(`Backend login endpoint ${filePath} may not export async function login.`);
    }
    if (!/res\.json\(|res\.status\(/.test(content)) {
      warnings.push(`Backend login endpoint ${filePath} may not use Express req/res patterns.`);
    }
  }

  return { valid: warnings.length === 0, warnings };
}
