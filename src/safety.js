const forbiddenPatterns = [
  /\brm\s+-rf\s+\/+/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bmkfs\b/i,
  /\b:>{2,}\b/i
];

export function validateShellCommand(command) {
  const normalized = command.trim();

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(normalized)) {
      throw new Error('Refusing to execute potentially destructive shell command.');
    }
  }

  return true;
}
