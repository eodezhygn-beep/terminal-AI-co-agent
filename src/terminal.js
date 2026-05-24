import { spawn } from 'child_process';
import { validateShellCommand } from './safety.js';

export function execShell(command, options = {}) {
  validateShellCommand(command);

  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
