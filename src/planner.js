export class Planner {
  constructor({ agents = [] } = {}) {
    this.agents = agents;
  }

  registerAgent(agent) {
    if (!this.agents.includes(agent)) {
      this.agents.push(agent);
    }
  }

  createPlan(taskDescription) {
    const steps = this.decomposeTask(taskDescription);
    return {
      task: taskDescription,
      steps,
      agentCount: this.agents.length,
      createdAt: new Date().toISOString()
    };
  }

  createApprovalPlan(taskDescription) {
    const basePlan = this.createPlan(taskDescription);
    const actions = this.createExecutionPlan(taskDescription);
    const terminalActions = this.extractTerminalActions(taskDescription);
    const changedFiles = [...new Set(actions.filter((action) => action.path && action.type !== 'create_folder').map((action) => action.path))];

    return {
      goal: basePlan.task,
      task: basePlan.task,
      steps: basePlan.steps,
      agentCount: basePlan.agentCount,
      createdAt: basePlan.createdAt,
      proposedActions: {
        create: actions.filter((action) => action.type === 'create_file').map((action) => action.path),
        edit: actions.filter((action) => action.type === 'edit_file').map((action) => action.path),
        install: terminalActions.filter(t => t.category === 'install').map(t => t.command),
        commands: terminalActions.filter(t => t.category !== 'install').map(t => t.command)
      },
      changedFiles,
      reasoning: this._defaultReasoning(taskDescription),
      actions,
      terminalActions  // Phase 3: Include terminal actions
    };
  }

  createExecutionPlan(taskDescription) {
    const normalized = (taskDescription || '').toLowerCase();
    const actions = [];

    if (!normalized.trim()) {
      return actions;
    }

    if (/\bauth(entication)?\b/.test(normalized) || /\blogin\b/.test(normalized)) {
      actions.push({ type: 'create_folder', path: 'backend/src/auth' });
      actions.push({
        type: 'create_file',
        path: 'backend/src/auth/auth.ts',
        content: `export function authenticateUser(email: string, password: string) {
  return {
    success: false,
    message: 'Auth stub: implement login logic here.'
  };
}
`
      });
      actions.push({
        type: 'create_file',
        path: 'backend/src/auth/README.md',
        content: `# Auth scaffold

This folder contains starter code for authentication and login handling.
Update this implementation with secure password storage, session management, and identity validation.
`
      });
      actions.push({
        type: 'append_file',
        path: 'README.md',
        content: `\n## Auth scaffold\nCreated backend/src/auth with starter login system files.\n`
      });
    } else if (/\bprisma\b|\bdatabase\b|\bdb\b/.test(normalized)) {
      actions.push({ type: 'create_folder', path: 'prisma' });
      actions.push({
        type: 'create_file',
        path: 'prisma/schema.prisma',
        content: `// Prisma schema scaffold\n// Add your datasource, generator, and models here.\n`
      });
      actions.push({
        type: 'append_file',
        path: 'README.md',
        content: `\n## Database scaffold\nCreated prisma/schema.prisma with starter schema notes.\n`
      });
    } else if (/\bdeploy\b|\bproduction\b|\bhost\b|\bserver\b/.test(normalized)) {
      actions.push({ type: 'create_folder', path: 'deploy' });
      actions.push({
        type: 'create_file',
        path: 'deploy/README.md',
        content: `# Deployment scaffold\n\nThis directory contains deployment notes and helper scripts for production delivery.\n`
      });
      actions.push({
        type: 'append_file',
        path: 'README.md',
        content: `\n## Deployment scaffold\nCreated deploy/README.md with starter deployment guidance.\n`
      });
    } else if (/\btest(s)?\b|\bcoverage\b|\bunit\b|\bintegration\b/.test(normalized)) {
      actions.push({
        type: 'create_file',
        path: 'tests/feature.test.js',
        content: `// Starter test scaffold\nimport assert from 'assert';\n\ndescribe('feature scaffold', () => {\n  it('should run a placeholder test', () => {\n    assert.strictEqual(1 + 1, 2);\n  });\n});\n`
      });
      actions.push({
        type: 'append_file',
        path: 'README.md',
        content: `\n## Testing scaffold\nCreated tests/feature.test.js with a placeholder test.\n`
      });
    } else {
      const slug = normalized
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 30) || 'task';
      const folder = `src/${slug}`;
      actions.push({ type: 'create_folder', path: folder });
      actions.push({
        type: 'create_file',
        path: `${folder}/index.ts`,
        content: `export function start() {\n  return { message: "Stub implementation for ${taskDescription.replace(/"/g, '\\"')}" };\n}\n`
      });
      actions.push({
        type: 'append_file',
        path: 'README.md',
        content: `\n## Task scaffold\nCreated ${folder}/index.ts for ${taskDescription}.\n`
      });
    }

    return actions;
  }

  // Phase 3: Extract terminal commands from task description
  extractTerminalActions(taskDescription) {
    const normalized = (taskDescription || '').toLowerCase();
    const commands = [];

    // Detect common terminal operations that need approval
    if (/\bnpm\s+install\b/.test(normalized)) {
      commands.push({
        type: 'terminal',
        category: 'install',
        command: 'npm install',
        safe: true
      });
    }

    if (/\bnpm\s+test\b/.test(normalized)) {
      commands.push({
        type: 'terminal',
        category: 'test',
        command: 'npm test',
        safe: true
      });
    }

    if (/\bnpx\s+prisma\s+migrate/.test(normalized)) {
      commands.push({
        type: 'terminal',
        category: 'database',
        command: 'npx prisma migrate dev',
        safe: true
      });
    }

    if (/\bgit\s+(add|commit|push)/.test(normalized)) {
      commands.push({
        type: 'terminal',
        category: 'git',
        command: 'git status',
        safe: true
      });
    }

    return commands;
  }

  _defaultReasoning(taskDescription) {
    return `Plan generated from task description: "${taskDescription}".`;
  }

  decomposeTask(taskDescription) {
    if (!taskDescription || !taskDescription.trim()) {
      return [];
    }

    const clauses = taskDescription
      .split(/\band\b|\bthen\b|\bnext\b|\bwith\b/i)
      .map((part) => part.trim())
      .filter(Boolean);

    if (clauses.length <= 1) {
      return [{ id: 1, description: taskDescription.trim() }];
    }

    return clauses.map((description, index) => ({
      id: index + 1,
      description,
      assignedAgent: this.agents[index % this.agents.length]?.name ?? 'unassigned'
    }));
  }
}
