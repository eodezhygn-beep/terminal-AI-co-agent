import { execShell } from './terminal.js';
import { callAI, getProvider } from './ai.js';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function analyzeShellFailure(command, result) {
  const stderr = (result.stderr || '').toLowerCase();
  const stdout = (result.stdout || '').toLowerCase();

  if (/command not found|not recognized/.test(stderr)) {
    return `The command failed because it could not be found. Verify that the executable exists and that your PATH is correct.`;
  }

  if (/permission denied|eacces/.test(stderr)) {
    return `The command failed due to insufficient permissions. Try checking file permissions or running with elevated rights if appropriate.`;
  }

  if (/no such file or directory|enoent/.test(stderr + stdout)) {
    return `The command referenced a missing path or file. Confirm the current directory and the command arguments.`;
  }

  if (result.code !== undefined && result.code !== 0) {
    return `The command exited with code ${result.code}. Review stderr for details.`;
  }

  return 'The command failed for an unknown reason. Inspect stdout/stderr for more detail.';
}

export async function debugShell(command, options = {}) {
  const retries = Number(options.retries ?? 1);
  const delayMs = Number(options.delayMs ?? 300);
  const askAI = Boolean(options.ai);
  const maxTokens = Number(options.maxTokens ?? 400);

  let lastResult = null;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const result = await execShell(command);
    lastResult = result;
    if (result.code === 0) {
      return {
        success: true,
        attempts: attempt,
        result
      };
    }

    if (attempt <= retries) {
      await wait(delayMs);
    }
  }

  const analysis = analyzeShellFailure(command, lastResult);
  const response = {
    success: false,
    attempts: retries + 1,
    result: lastResult,
    analysis
  };

  if (askAI && getProvider()) {
    const prompt = `A shell command failed after ${retries + 1} attempt(s):\n${command}\n\nstdout:\n${lastResult.stdout}\nstderr:\n${lastResult.stderr}\n\nExplain the failure and suggest one fix.`;
    response.aiSuggestion = await callAI(prompt, { maxTokens });
  }

  return response;
}
