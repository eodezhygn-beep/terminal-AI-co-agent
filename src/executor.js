import readline from 'readline';
import { createFolder, readFile, writeFile, appendFile, fileExists } from './fs.js';
import { execShell } from './terminal.js';
import { analyzeShellCommand } from './safety.js';
import { generateCode } from './code-generator.js';
import { validateFileWrite } from './validator.js';

function describeAction(action) {
  switch (action.type) {
    case 'create_folder':
      return `Creating folder ${action.path}`;
    case 'create_file':
      return `Writing ${action.path}`;
    case 'edit_file':
      return `Editing ${action.path}`;
    case 'append_file':
      return `Appending ${action.path}`;
    case 'read_file':
      return `Reading ${action.path}`;
    default:
      return `Executing action ${action.type}`;
  }
}

function requestFileAction(filePath) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('FILE EXISTS:');
    console.log(filePath);
    console.log('');
    console.log('Choose:');
    console.log('[1] overwrite');
    console.log('[2] append');
    console.log('[3] skip');

    rl.question('> ', (answer) => {
      rl.close();
      const normalized = (answer || '').trim().toLowerCase();
      if (normalized === '1' || normalized === 'overwrite') {
        resolve('overwrite');
        return;
      }
      if (normalized === '2' || normalized === 'append') {
        resolve('append');
        return;
      }
      if (normalized === '3' || normalized === 'skip') {
        resolve('skip');
        return;
      }
      resolve(null);
    });
  });
}

async function promptExistingFileAction(filePath) {
  let choice = await requestFileAction(filePath);
  while (!choice) {
    console.log('Please choose 1, 2, or 3.');
    choice = await requestFileAction(filePath);
  }
  return choice;
}

async function executeCreateFolder(action, summary) {
  await createFolder(action.path);
  summary.createdFolders.push(action.path);
}

async function generateFileContentIfNeeded(action, projectContext) {
  if (action.type !== 'create_file' || (action.content && action.content.trim() !== '')) {
    return action.content || '';
  }

  const generated = generateCode({
    taskDescription: action.taskDescription || '',
    path: action.path,
    projectContext
  });

  return generated.content || '';
}

async function executeCreateOrEditFile(action, summary, projectContext) {
  const targetPath = action.path;
  const exists = await fileExists(targetPath);
  const content = await generateFileContentIfNeeded(action, projectContext);

  if (!content || !content.trim()) {
    console.log(`Warning: no content generated for ${targetPath}. Writing empty file.`);
  } else {
    const validation = validateFileWrite({ path: targetPath, content, projectContext });
    if (validation.warnings.length > 0) {
      console.log(`Warning: ${targetPath} validation issues:`);
      validation.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }
  }

  if (exists) {
    const choice = await promptExistingFileAction(targetPath);
    if (choice === 'skip') {
      summary.skipped.push(targetPath);
      return;
    }
    if (choice === 'append') {
      await appendFile(targetPath, content);
      summary.editedFiles.push(targetPath);
      return;
    }
    await writeFile(targetPath, content);
    summary.editedFiles.push(targetPath);
    return;
  }

  await writeFile(targetPath, content);
  summary.createdFiles.push(targetPath);
}

async function executeAppendFile(action, summary) {
  const targetPath = action.path;
  const content = action.content || '';
  const exists = await fileExists(targetPath);

  if (exists) {
    const choice = await promptExistingFileAction(targetPath);
    if (choice === 'skip') {
      summary.skipped.push(targetPath);
      return;
    }
    if (choice === 'overwrite') {
      await writeFile(targetPath, content);
      summary.editedFiles.push(targetPath);
      return;
    }
    await appendFile(targetPath, content);
    summary.editedFiles.push(targetPath);
    return;
  }

  await appendFile(targetPath, content);
  summary.createdFiles.push(targetPath);
}

async function executeReadFile(action) {
  return readFile(action.path);
}

export async function executePlan(actions, projectContext = {}) {
  const summary = {
    createdFolders: [],
    createdFiles: [],
    editedFiles: [],
    skipped: [],
    failed: [],
    changedFiles: []
  };

  const total = actions.length;

  for (let index = 0; index < total; index += 1) {
    const action = actions[index];
    const step = index + 1;
    console.log(`[${step}/${total}] ${describeAction(action)}`);

    try {
      switch (action.type) {
        case 'create_folder':
          await executeCreateFolder(action, summary);
          break;
        case 'create_file':
        case 'edit_file':
          await executeCreateOrEditFile(action, summary, projectContext);
          break;
        case 'append_file':
          await executeAppendFile(action, summary);
          break;
        case 'read_file':
          await executeReadFile(action);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }
      console.log('✓ success');
    } catch (error) {
      console.log('✗ Failed:');
      console.log(action.path || action.type);
      console.log(`  ${error.message}`);
      summary.failed.push({ action, error: error.message });
    }
  }

  summary.changedFiles = Array.from(
    new Set([...summary.createdFiles, ...summary.editedFiles])
  );
  return summary;
}

// Phase 3: Terminal command execution

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
      // Safety check before execution
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
          const truncated = result.stdout.length > 500 ? result.stdout.substring(0, 500) + '\n...' : result.stdout;
          console.log(truncated.trim());
        }
        if (!result.stdout && !result.stderr) {
          console.log('(no output)');
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
          const truncated = result.stderr.length > 500 ? result.stderr.substring(0, 500) + '\n...' : result.stderr;
          console.log(truncated.trim());
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
