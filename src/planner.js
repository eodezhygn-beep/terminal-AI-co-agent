export class Planner {
  constructor({ agents = [] } = {}) {
    this.agents = agents;
  }

  registerAgent(agent) {
    if (!this.agents.includes(agent)) {
      this.agents.push(agent);
    }
  }

  /**
   * Classify task intent into filesystem, implementation, or planning
   * Returns: { intent: 'filesystem'|'implementation'|'planning', confidence: 0-1 }
   */
  classifyIntent(taskDescription) {
    const normalized = (taskDescription || '').toLowerCase();
    
    // Filesystem intent patterns
    const filesystemPatterns = [
      /\bcreate\s+(?:folder|directory|dir|file)\b/,
      /\bfolder\s+named\b/,
      /\bcreate\s+a\s+file\b/,
      /\binside\s+create\b/,
      /\bmkdir\b/,
      /\bwrite\s+to\b/,
      /\brename\b/,
      /\bmove\b/,
      /\bdelete\b/,
      /\bremove\s+(?:folder|directory|file)\b/
    ];

    // Implementation intent patterns
    const implementationPatterns = [
      /\bbuild\s+(?:feature|component|api|logic)\b/,
      /\bcreate\s+(?:react|component|api|endpoint|service)\b/,
      /\bimplement\b/,
      /\badd\s+(?:function|method|class)\b/,
      /\bwrite\s+(?:code|logic|handler)\b/,
      /\bauth(?:entication|enticate)?\b/,
      /\bapi\b/,
      /\bdatabase\b/,
      /\bprisma\b/
    ];

    // Planning intent patterns
    const planningPatterns = [
      /\barchitecture\b/,
      /\bdesign\s+(?:system|pattern|proposal)\b/,
      /\brepo\s+structure\b/,
      /\bpropose\b/,
      /\bplan\b/
    ];

    const filesystemMatch = filesystemPatterns.some(p => p.test(normalized));
    const implementationMatch = implementationPatterns.some(p => p.test(normalized));
    const planningMatch = planningPatterns.some(p => p.test(normalized));

    if (filesystemMatch && !implementationMatch) {
      return { intent: 'filesystem', confidence: 0.95 };
    } else if (planningMatch && !implementationMatch) {
      return { intent: 'planning', confidence: 0.9 };
    } else if (implementationMatch) {
      return { intent: 'implementation', confidence: 0.85 };
    }

    return { intent: 'implementation', confidence: 0.5 };
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

    // Classify intent
    const { intent } = this.classifyIntent(taskDescription);

    // For filesystem intent, parse literal instructions
    if (intent === 'filesystem') {
      return this._parseFilesystemInstructions(taskDescription);
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
    }

    // For implementation and planning intents, return empty to avoid automatic scaffolding
    // The approval plan will still show reasoning, but no files will be auto-created
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

  /**
   * Parse literal filesystem instructions from task description
   * Extracts folder/file creation patterns and respects literal paths
   */
  _parseFilesystemInstructions(taskDescription) {
    const actions = [];
    const lines = taskDescription.split('\n').map(l => l.trim()).filter(Boolean);

    // Parse lines for filesystem operations
    let currentFolder = null;
    const createdPaths = new Set();

    for (const line of lines) {
      // Skip exclusion directives (No TypeScript, No README edits)
      if (/^no\s+/i.test(line)) {
        continue;
      }

      // Match folder creation patterns
      const folderMatch = line.match(/create\s+(?:folder|directory|dir)\s+named\s+([\w\-./]+)/i) ||
                         line.match(/^([\w\-./]+)\s*\/\s*$/i);
      if (folderMatch) {
        const folderPath = folderMatch[1];
        if (!createdPaths.has(folderPath)) {
          actions.push({ type: 'create_folder', path: folderPath });
          createdPaths.add(folderPath);
          currentFolder = folderPath;
        }
        continue;
      }

      // Match file creation patterns
      const fileMatch = line.match(/(?:create|inside\s+create)\s+([\w\-./]+\.\w+)/i);
      if (fileMatch) {
        const filePath = fileMatch[1];
        // If no folder specified yet, use relative path as-is
        if (!createdPaths.has(filePath)) {
          actions.push({
            type: 'create_file',
            path: filePath,
            content: ''
          });
          createdPaths.add(filePath);
        }
        continue;
      }
    }

    // If no explicit actions were parsed, try to extract folder from first mention
    if (actions.length === 0) {
      const folderMatch = taskDescription.match(/create\s+(?:folder|directory)\s+named\s+([\w\-]+)/i);
      if (folderMatch) {
        const folder = folderMatch[1];
        actions.push({ type: 'create_folder', path: folder });
      }
    }

    return actions;
  }

  _defaultReasoning(taskDescription) {
    const { intent } = this.classifyIntent(taskDescription);
    return `Plan generated from task description: "${taskDescription}". Intent: ${intent}.`;
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
