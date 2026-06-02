import { execShell } from './terminal.js';
import { analyzeShellCommand } from './safety.js';
import readline from 'readline';

/**
 * Phase 3: Terminal Command Execution with Safety Checks
 * 
 * Executes terminal commands with:
 * - Safety validation before execution
 * - Stdout/stderr capture
 * - Detailed logging
 * - Failure handling
 */

export class TerminalExecutionResult {
  constructor(command, success, stdout, stderr, code) {
    this.command = command;
    this.success = success;
    this.stdout = stdout;
    this.stderr = stderr;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

export async function executeTerminalActions(actions) {
  const summary = {
    executed: [],
    skipped: [],
    failed: [],
    total: actions.length
  };

  if (actions.length === 0) {
    return summary;
  }

  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];
    const step = index + 1;

    console.log(`\n[${step}/${actions.length}] Running:`);
    console.log(action.command);
    console.log('');
    console.log('⟳ executing...');

    try {
      // Safety check
      const safety = analyzeShellCommand(action.command);
      if (!safety.safe) {
        console.log(`✗ BLOCKED`);
        console.log(`  Reason: ${safety.reason}`);
        console.log('');
        summary.failed.push({
          command: action.command,
          error: safety.reason,
          blocked: true
        });
        continue;
      }

      // Execute command
      const result = await execShell(action.command);

      if (result.code === 0) {
        console.log('✓ success');
        if (result.stdout) {
          console.log('\nstdout:');
          console.log(result.stdout.trim());
        }
        if (result.stderr) {
          console.log('\nstderr:');
          console.log(result.stderr.trim());
        }
        console.log('');
        summary.executed.push({
          command: action.command,
          result
        });
      } else {
        console.log('✗ failed');
        console.log(`  Exit code: ${result.code}`);
        if (result.stderr) {
          console.log('\nstderr:');
          console.log(result.stderr.trim());
        }
        console.log('');

        // Ask to continue on failure
        const shouldContinue = await promptContinueOnFailure(action.command);
        if (!shouldContinue) {
          console.log('\nExecution cancelled by user.');
          summary.failed.push({
            command: action.command,
            error: `Failed with exit code ${result.code}`,
            result
          });
          return summary;
        }

        summary.failed.push({
          command: action.command,
          error: `Failed with exit code ${result.code}`,
          result
        });
      }
    } catch (error) {
      console.log('✗ error');
      console.log(`  ${error.message}`);
      console.log('');

      const shouldContinue = await promptContinueOnFailure(action.command);
      if (!shouldContinue) {
        console.log('\nExecution cancelled by user.');
        summary.failed.push({
          command: action.command,
          error: error.message
        });
        return summary;
      }

      summary.failed.push({
        command: action.command,
        error: error.message
      });
    }
  }

  return summary;
}

function promptContinueOnFailure(command) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('Continue? (y/n)');
    rl.question('> ', (answer) => {
      rl.close();
      const normalized = (answer || '').trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

export function formatTerminalApprovalPlan(commands) {
  const lines = [];
  
  lines.push('');
  lines.push('TERMINAL ACTIONS REQUIRED');
  lines.push('');
  lines.push('Commands proposed:');
  lines.push('');

  commands.forEach((cmd, index) => {
    lines.push(`[${index + 1}]`);
    lines.push(cmd.command);
    if (cmd.category) {
      lines.push(`Category: ${cmd.category}`);
    }
    lines.push('');
  });

  lines.push('Proceed with terminal commands? (y/n)');
  return lines.join('\n');
}

export async function promptTerminalApproval() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('> ', (answer) => {
      rl.close();
      const normalized = (answer || '').trim().toLowerCase();
      const approved = normalized === 'y' || normalized === 'yes';
      resolve(approved);
    });
  });
}
