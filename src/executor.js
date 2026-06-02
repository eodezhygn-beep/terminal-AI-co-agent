import readline from 'readline';
import { createFolder, readFile, writeFile, appendFile, fileExists } from './fs.js';

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

async function executeCreateOrEditFile(action, summary) {
  const targetPath = action.path;
  const exists = await fileExists(targetPath);
  const content = action.content || '';

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

export async function executePlan(actions) {
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
          await executeCreateOrEditFile(action, summary);
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
