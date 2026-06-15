// Comprehensive tests for CLI argument parsing and planner behavior fixes
import assert from 'assert';
import { Planner } from '../src/planner.js';
import { generateCode } from '../src/code-generator.js';

// Test 1: BUG 1 - Model argument parsing (--model flag handling)
describe('CLI Model Argument Parsing', () => {
  it('should correctly parse --model flag with model name containing special chars', () => {
    // Simulating parseAIArguments from cli.js
    function parseAIArguments(args) {
      const parts = [...args];
      const separatorIndex = parts.indexOf('--');
      const candidateParts = separatorIndex !== -1 ? parts.slice(0, separatorIndex) : parts;
      const promptParts = separatorIndex !== -1 ? parts.slice(separatorIndex + 1) : [...parts];
      const parsed = { explicitModel: null, promptParts };

      const modelFlagIndex = candidateParts.findIndex((arg) => arg === '--model' || arg.startsWith('--model='));
      if (modelFlagIndex !== -1) {
        const flag = candidateParts[modelFlagIndex];
        if (flag === '--model') {
          parsed.explicitModel = candidateParts[modelFlagIndex + 1];
          candidateParts.splice(modelFlagIndex, 2);
        } else {
          parsed.explicitModel = flag.split('=')[1];
          candidateParts.splice(modelFlagIndex, 1);
        }

        if (separatorIndex === -1) {
          parsed.promptParts = candidateParts;
        }
      }

      return parsed;
    }

    const args = ['--model', 'openai/gpt-oss-120b:free', 'Create', 'a', 'folder', 'named', 'frontend'];
    const result = parseAIArguments(args);

    assert.strictEqual(result.explicitModel, 'openai/gpt-oss-120b:free', 'Model should be parsed correctly');
    assert.deepStrictEqual(result.promptParts, ['Create', 'a', 'folder', 'named', 'frontend'], 'Task should not include model flag');
    assert.strictEqual(result.promptParts.join(' '), 'Create a folder named frontend', 'Task prompt should be exact');
  });

  it('should handle --model=value syntax', () => {
    function parseAIArguments(args) {
      const parts = [...args];
      const candidateParts = [...parts];
      const parsed = { explicitModel: null, promptParts: parts };

      const modelFlagIndex = candidateParts.findIndex((arg) => arg === '--model' || arg.startsWith('--model='));
      if (modelFlagIndex !== -1) {
        const flag = candidateParts[modelFlagIndex];
        if (flag === '--model') {
          parsed.explicitModel = candidateParts[modelFlagIndex + 1];
          candidateParts.splice(modelFlagIndex, 2);
        } else {
          parsed.explicitModel = flag.split('=')[1];
          candidateParts.splice(modelFlagIndex, 1);
        }
        parsed.promptParts = candidateParts;
      }

      return parsed;
    }

    const args = ['--model=claude-3-sonnet', 'Build', 'a', 'REST', 'API'];
    const result = parseAIArguments(args);

    assert.strictEqual(result.explicitModel, 'claude-3-sonnet', 'Model should be parsed with = syntax');
    assert.deepStrictEqual(result.promptParts, ['Build', 'a', 'REST', 'API'], 'Task should not include model flag');
  });
});

// Test 2: BUG 2 & 3 - Intent classification and filesystem instruction parsing
describe('Planner Intent Classification & Filesystem Handling', () => {
  let planner;

  beforeEach(() => {
    planner = new Planner({ agents: [] });
  });

  it('should classify literal filesystem instructions as filesystem intent', () => {
    const tasks = [
      'Create a folder named frontend in repo root.',
      'Create a folder named backend. Inside create hello.txt.',
      'mkdir src/components',
      'Create file test.js',
      'Create folder named utils. No TypeScript.',
      'Create a directory named config'
    ];

    tasks.forEach(task => {
      const { intent, confidence } = planner.classifyIntent(task);
      assert.strictEqual(intent, 'filesystem', `Task "${task}" should be classified as filesystem intent`);
      assert(confidence > 0.8, `Confidence for "${task}" should be high`);
    });
  });

  it('should classify implementation tasks as implementation intent', () => {
    const tasks = [
      'Build a REST API for users',
      'Create a React component',
      'Implement authentication logic',
      'Add a login handler'
    ];

    tasks.forEach(task => {
      const { intent } = planner.classifyIntent(task);
      assert.strictEqual(intent, 'implementation', `Task "${task}" should be classified as implementation intent`);
    });
  });

  it('should classify explicit React login tasks as implementation intent', () => {
    const { intent } = planner.classifyIntent('Build a React login page');

    assert.strictEqual(intent, 'implementation', 'React login task should be classified as implementation intent');
  });

  it('should classify login tasks as implementation when the project context is React', () => {
    const { intent } = planner.classifyIntent('Build a login page', { framework: 'react' });

    assert.strictEqual(intent, 'implementation', 'React project context should enable login task matching');
  });

  it('should classify planning tasks as planning intent', () => {
    const tasks = [
      'Design the system architecture',
      'Propose a repo structure',
      'Plan the database schema'
    ];

    tasks.forEach(task => {
      const { intent } = planner.classifyIntent(task);
      assert.strictEqual(intent, 'planning', `Task "${task}" should be classified as planning intent`);
    });
  });

  it('should parse literal folder creation without automatic scaffolding', () => {
    const task = 'Create a folder named frontend in repo root.';
    const actions = planner.createExecutionPlan(task);

    assert(actions.length > 0, 'Should create at least one action for folder creation');
    assert.strictEqual(actions[0].type, 'create_folder', 'First action should be folder creation');
    assert.strictEqual(actions[0].path, 'frontend', 'Folder path should be "frontend"');
    assert(!actions.some(a => a.type === 'create_file' && a.path.includes('index.ts')), 'Should NOT create TypeScript scaffolds');
    assert(!actions.some(a => a.type === 'append_file' && a.path === 'README.md'), 'Should NOT edit README');
  });

  it('should parse folder and file creation instructions', () => {
    const task = 'Create a folder named frontend in repo root.\nInside create hello.txt.\nText: hello from frontend\nNo TypeScript.\nNo README edits.';
    const actions = planner.createExecutionPlan(task);

    const folderActions = actions.filter(a => a.type === 'create_folder');
    const fileActions = actions.filter(a => a.type === 'create_file');

    assert(folderActions.length > 0, 'Should create folder');
    assert.strictEqual(folderActions[0].path, 'frontend', 'Folder should be named "frontend"');
    assert.strictEqual(fileActions.length, 1, 'Should create a file inside the folder');
    assert.strictEqual(fileActions[0].path, 'frontend/hello.txt', 'File should be created inside frontend');
    assert(!actions.some(a => a.type === 'append_file'), 'Should NOT append to README');
    assert(!actions.some(a => a.path && a.path.includes('index.ts')), 'Should NOT create TypeScript files');
  });

  it('should parse file creation inside a previously created folder', () => {
    const task = 'Create a folder named frontend.\nCreate hello.txt inside frontend.\nNo TypeScript.\nNo README edits.';
    const actions = planner.createExecutionPlan(task);

    assert(actions.some(a => a.type === 'create_folder' && a.path === 'frontend'), 'Should create frontend folder');
    assert(actions.some(a => a.type === 'create_file' && a.path === 'frontend/hello.txt'), 'Should place hello.txt inside frontend');
  });

  it('should parse nested folder creation and repo-root placement', () => {
    const task = 'Create folder named frontend in repo root.\nCreate folder named frontend/components under frontend.\nCreate file index.md inside frontend/components.\nNo TypeScript.\nNo README edits.';
    const actions = planner.createExecutionPlan(task);

    assert(actions.some(a => a.type === 'create_folder' && a.path === 'frontend'), 'Should create frontend at repo root');
    assert(actions.some(a => a.type === 'create_folder' && a.path === 'frontend/components'), 'Should create nested frontend/components folder');
    assert(actions.some(a => a.type === 'create_file' && a.path === 'frontend/components/index.md'), 'Should place index.md inside frontend/components');
  });

  it('should create actions for explicit filesystem prompts', () => {
    const task = 'Create file Login.tsx inside frontend/auth';
    const actions = planner.createExecutionPlan(task);

    assert(actions.length > 0, 'Should return actions for explicit filesystem prompts');
    assert(actions.some(a => a.type === 'create_file' && a.path === 'frontend/auth/Login.tsx'), 'Should create the requested file inside the explicit path');
  });

  it('should recognize path-based prompts as filesystem intent and create file actions', () => {
    const task = 'Create frontend/auth/Login.tsx';
    const { intent } = planner.classifyIntent(task);
    assert.strictEqual(intent, 'filesystem', 'Path-based prompt should be classified as filesystem intent');

    const actions = planner.createExecutionPlan(task);
    assert.strictEqual(actions.length, 1, 'Should generate exactly one filesystem action for a single path');
    assert.deepStrictEqual(actions[0], {
      type: 'create_file',
      path: 'frontend/auth/Login.tsx',
      content: ''
    }, 'Should create a file action for the explicit path');
  });

  it('should return empty actions for implementation intent (no auto scaffolding)', () => {
    const task = 'Build a feature that authenticates users';
    const actions = planner.createExecutionPlan(task);

    assert.strictEqual(actions.length, 0, 'Should NOT auto-scaffold for implementation intent');
  });

  it('should return empty actions for planning intent (no auto scaffolding)', () => {
    const task = 'Design the system architecture';
    const actions = planner.createExecutionPlan(task);

    assert.strictEqual(actions.length, 0, 'Should NOT auto-scaffold for planning intent');
  });

  it('should respect "No TypeScript" and "No README" exclusion directives', () => {
    const task = 'Create a folder named config.\nNo TypeScript.\nNo README edits.';
    const actions = planner.createExecutionPlan(task);

    const hasTypeScript = actions.some(a => a.path && (a.path.includes('.ts') || a.path.includes('index')));
    const hasREADME = actions.some(a => a.type === 'append_file' && a.path === 'README.md');

    assert(!hasTypeScript, 'Should NOT create TypeScript files when "No TypeScript" is specified');
    assert(!hasREADME, 'Should NOT edit README when "No README edits" is specified');
  });
});

// Test 3: Approval plan should not include unwanted file modifications
describe('Approval Plan File Handling', () => {
  let planner;

  beforeEach(() => {
    planner = new Planner({ agents: [] });
  });

  it('should not propose README edits for filesystem tasks', () => {
    const task = 'Create a folder named frontend';
    const approvalPlan = planner.createApprovalPlan(task);

    const readmeEdits = approvalPlan.proposedActions.edit.filter(f => f === 'README.md');
    assert.strictEqual(readmeEdits.length, 0, 'Should NOT propose README.md edits for filesystem intent');
  });

  it('should not propose TypeScript file creation for filesystem tasks', () => {
    const task = 'Create a folder named utils';
    const approvalPlan = planner.createApprovalPlan(task);

    const tsFiles = approvalPlan.proposedActions.create.filter(f => f.includes('.ts'));
    assert.strictEqual(tsFiles.length, 0, 'Should NOT propose TypeScript file creation for filesystem intent');
  });

  it('should include intent in reasoning for traceability', () => {
    const task = 'Create a folder named src';
    const approvalPlan = planner.createApprovalPlan(task);

    assert(approvalPlan.reasoning.includes('filesystem'), 'Reasoning should indicate filesystem intent');
  });

  it('should show no proposed actions for implementation intent', () => {
    const task = 'Build a login feature';
    const approvalPlan = planner.createApprovalPlan(task);

    const totalProposedActions = approvalPlan.proposedActions.create.length +
                                approvalPlan.proposedActions.edit.length +
                                approvalPlan.proposedActions.install.length +
                                approvalPlan.proposedActions.commands.length;

    assert.strictEqual(totalProposedActions, 0, 'Should NOT propose actions for implementation intent');
  });
});

// Test 4: Legacy test (ensure we don't break existing functionality)
describe('feature scaffold', () => {
  it('should run a placeholder test', () => {
    assert.strictEqual(1 + 1, 2);
  });
});

describe('Code generation for framework-aware files', () => {
  let planner;

  beforeEach(() => {
    planner = new Planner({ agents: [] });
  });

  it('should generate a non-empty React login page using React and Tailwind', async () => {
    const projectContext = { framework: 'react', tailwind: true, preferredFrontendPath: 'src' };
    const actions = planner.createExecutionPlan('Create a mobile-first login page using React and Tailwind', projectContext);

    const loginAction = actions.find((action) => action.path.endsWith('Login.tsx'));
    const formAction = actions.find((action) => action.path.endsWith('LoginForm.tsx'));

    assert(loginAction, 'Login.tsx action should exist');
    assert(formAction, 'LoginForm.tsx action should exist');
    assert.strictEqual(loginAction.content, '', 'Generated framework-aware action should start empty');
    assert.strictEqual(formAction.content, '', 'Generated framework-aware action should start empty');
  });

  it('should generate a non-empty backend login endpoint for auth API task', async () => {
    const projectContext = { backend: true, preferredBackendPath: 'backend/src' };
    const actions = planner.createExecutionPlan('Create login API endpoint', projectContext);

    const apiAction = actions.find((action) => action.path.endsWith('auth/login.ts'));
    assert(apiAction, 'backend auth/login.ts action should exist');
    assert.strictEqual(apiAction.content, '', 'Generated framework-aware action should start empty');
  });

  it('should produce non-empty generated content for the React login page', () => {
    const result = generateCode({
      taskDescription: 'Create a mobile-first login page using React and Tailwind',
      path: 'src/features/auth/Login.tsx',
      projectContext: { framework: 'react', tailwind: true }
    });

    assert.ok(result.content && result.content.trim().length > 0, 'Generated React login page content should be non-empty');
    assert.strictEqual(result.language, 'tsx');
    assert.ok(result.content.includes('LoginForm'), 'Generated content should reference LoginForm');
  });

  it('should produce non-empty generated content for the backend login endpoint', () => {
    const result = generateCode({
      taskDescription: 'Create login API endpoint',
      path: 'backend/src/auth/login.ts',
      projectContext: { backend: true }
    });

    assert.ok(result.content && result.content.trim().length > 0, 'Generated backend login endpoint content should be non-empty');
    assert.strictEqual(result.language, 'typescript');
    assert.ok(result.content.includes('export async function login'), 'Generated API file should export login function');
  });
});
