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
      /\bcreate\s+(?:a\s+)?(?:folder|directory|dir)\b/,
      /\bcreate\s+(?:a\s+)?(?:file)\b/,
      /\bcreate\s+(?:folder|directory)\s+named\b/,
      /\bmkdir\b/,
      /\bcreate\s+file\b/,
      /\binside\b/,
      /\bthe\s+file\s+content\b/,
      /\btext:\b/,
      /\bput\s+this\s+text\b/,
      /\bwrite\s+.+\s+inside\b/,
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

    // Unknown / no specific intent detected
    return { intent: 'unknown', confidence: 0.5 };
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
    // If the user explicitly included filesystem instructions anywhere in the
    // text, prefer literal parsing. This avoids accidental scaffolding for
    // implementation/planning prompts like "Design architecture...".
    const hasFilesystemKeywords = /create\s+(?:a\s+)?(?:folder|directory|dir|file)|mkdir\b|inside\s+[\w\-\.\/]+|the\s+file\s+content\b|text:\b|put\s+this\s+text\b|write\s+.+\s+inside\b/i.test(normalized);

    if (intent === 'filesystem' || hasFilesystemKeywords) {
      return this._parseFilesystemInstructions(taskDescription);
    }

    // For implementation/planning/unknown intents without explicit filesystem
    // instructions, do not create files, edit READMEs, or scaffold. Return
    // an empty execution plan to avoid legacy fallthrough behavior.
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
    const createdFolders = new Set();

    const normalizePath = (path) => {
      return path
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/[.,;:!?]+$/g, '');
    };

    let lastFileAction = null;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      // Skip exclusion directives (No TypeScript, No README edits)
      if (/^no\s+/i.test(line)) {
        continue;
      }

      const folderMatch = line.match(/create\s+(?:a\s+)?(?:folder|directory|dir)\s+(?:named\s+)?["']?([\w\-.\/]+)["']?(?:\s+(?:in|at)\s+repo\s+root)?/i)
        || line.match(/(?:^|\s)mkdir\s+-p?\s+["']?([\w\-.\/]+)["']?/i)
        || line.match(/^([\w\-.\/]+)\s*\/\s*$/i);
      if (folderMatch) {
        const folderPath = normalizePath(folderMatch[1]);
        if (!createdFolders.has(folderPath)) {
          actions.push({ type: 'create_folder', path: folderPath });
          createdFolders.add(folderPath);
          createdPaths.add(folderPath);
        }
        currentFolder = folderPath;
        lastFileAction = null;
        continue;
      }

      const fileMatch = line.match(/create\s+(?:a\s+)?(?:file\s+(?:named\s+)?)?["']?([\w\-.]+\.[\w]+)["']?(?:\s+(?:inside|in|under|at)\s+["']?([\w\-.\/]+)["']?)?/i)
        || line.match(/(?:inside|in|under)\s+["']?([\w\-.\/]+)["']?\s*,?\s*(?:create|create\s+a)?\s*["']?([\w\-.]+\.[\w]+)["']?/i)
        || line.match(/([\w\-.]+\.[\w]+)\s+inside\s+([\w\-.\/]+)/i);
      if (fileMatch) {
        let fileName = fileMatch[1];
        let parentFolder = fileMatch[2];
        // If the regex matched reversed groups (inside X create Y), ensure correct order
        if (!parentFolder && fileMatch[2] && fileMatch[1] && /\//.test(fileMatch[2])) {
          parentFolder = fileMatch[2];
        }

        let filePath = fileName;
        if (parentFolder) {
          filePath = `${normalizePath(parentFolder)}/${fileName}`;
        } else if (/^(?:inside|in|under)\b/i.test(line) && currentFolder) {
          filePath = `${normalizePath(currentFolder)}/${fileName}`;
        }

        filePath = normalizePath(filePath);
        if (!createdPaths.has(filePath)) {
          const action = {
            type: 'create_file',
            path: filePath,
            content: ''
          };
          actions.push(action);
          createdPaths.add(filePath);
          lastFileAction = action;
        }
        continue;
      }

      // Detect inline "write X inside Y" patterns (capture content and target)
      const writeInsideMatch = line.match(/write\s+["']?(.+?)["']?\s+inside\s+["']?([\w\-.\/]+(?:\/[\w\-.]+)?(?:\.[\w]+)?)?["']?/i);
      if (writeInsideMatch) {
        const contentText = writeInsideMatch[1].trim();
        const target = writeInsideMatch[2];
        if (target) {
          const targetPath = normalizePath(target);
          // If target looks like a file
          if (/\.[a-z0-9]+$/i.test(targetPath)) {
            if (!createdPaths.has(targetPath)) {
              const action = { type: 'create_file', path: targetPath, content: contentText };
              actions.push(action);
              createdPaths.add(targetPath);
            } else {
              // append content to existing file action
              const existing = actions.find(a => a.path === targetPath && a.type === 'create_file');
              if (existing) existing.content = (existing.content || '') + contentText;
            }
            continue;
          }
        }
      }

      // Detect content intro lines such as "The file content must be:", "Text:", etc.
      const contentIntro = line.match(/^(?:the\s+file\s+content(?:\s+(?:must|should)\s+be)?|text|put\s+this\s+text|file\s+content)\s*[:\-]?\s*(.*)$/i);
      if (contentIntro) {
        const inline = contentIntro[1] && contentIntro[1].trim();
        if (inline) {
          if (lastFileAction) lastFileAction.content = (lastFileAction.content || '') + inline + '\n';
        } else {
          // consume subsequent lines as content until next instruction
          let contentLines = [];
          let j = idx + 1;
          while (j < lines.length) {
            const next = lines[j];
            // stop if next line looks like a new instruction
            if (/^create\b|^mkdir\b|^inside\b|^create\s+(?:a\s+)?(?:file|folder|directory|dir)\b/i.test(next)) break;
            contentLines.push(next);
            j++;
          }
          if (lastFileAction) lastFileAction.content = (lastFileAction.content || '') + contentLines.join('\n') + '\n';
          // advance idx to skip consumed content lines
          idx = j - 1;
        }
        continue;
      }
    }

    // If no explicit actions were parsed, try to extract folder from first mention
    if (actions.length === 0) {
      const folderMatch = taskDescription.match(/create\s+(?:folder|directory|dir)\s+(?:named\s+)?([\w\-.\/]+)(?:\s+(?:in|at)\s+repo\s+root)?/i);
      if (folderMatch) {
        const folder = normalizePath(folderMatch[1]);
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
