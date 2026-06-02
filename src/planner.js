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
    const actions = this._categorizeTask(taskDescription);
    const changedFiles = [...new Set([...(actions.create || []), ...(actions.edit || [])])];

    return {
      goal: basePlan.task,
      task: basePlan.task,
      steps: basePlan.steps,
      agentCount: basePlan.agentCount,
      createdAt: basePlan.createdAt,
      proposedActions: {
        create: actions.create,
        edit: actions.edit,
        install: actions.install,
        commands: actions.commands
      },
      changedFiles,
      reasoning: actions.reasoning || this._defaultReasoning(taskDescription)
    };
  }

  _categorizeTask(taskDescription) {
    const normalized = (taskDescription || '').toLowerCase();
    const create = [];
    const edit = [];
    const install = [];
    const commands = [];
    let reasoning = '';

    if (!normalized.trim()) {
      reasoning = 'Task description was empty; no actions were proposed.';
      return { create, edit, install, commands, reasoning };
    }

    if (/\bauth(entication)?\b/.test(normalized) || /\blogin\b/.test(normalized)) {
      create.push('backend/src/routes/auth.ts', 'backend/src/middleware/auth.ts');
      edit.push('backend/src/server.ts', 'prisma/schema.prisma');
      install.push('jsonwebtoken', 'bcrypt');
      commands.push('npm install', 'npx prisma migrate dev');
      reasoning = 'JWT auth for mobile-first app.';
    } else if (/\bprisma\b|\bdatabase\b|\bdb\b/.test(normalized)) {
      create.push('prisma/schema.prisma');
      edit.push('src/database.js', 'src/server.js');
      install.push('@prisma/client', 'prisma');
      commands.push('npx prisma migrate dev');
      reasoning = 'Database schema and migration changes for the requested data layer.';
    } else if (/\bdeploy\b|\bproduction\b|\bhost\b|\bserver\b/.test(normalized)) {
      create.push('Dockerfile', 'deploy/scripts/deploy.sh');
      edit.push('README.md');
      install.push('docker', 'node');
      commands.push('docker build .', 'docker push <registry>');
      reasoning = 'Prepare deployment artifacts and environment for production delivery.';
    } else if (/\btest(s)?\b|\bcoverage\b|\bunit\b|\bintegration\b/.test(normalized)) {
      create.push('tests/feature.test.js');
      edit.push('package.json');
      install.push('jest');
      commands.push('npm test');
      reasoning = 'Add test scaffolding and ensure the project can validate behavior.';
    } else {
      const slug = normalized
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 30) || 'task';
      create.push(`src/${slug}.ts`);
      edit.push('README.md');
      reasoning = `High-level plan for "${taskDescription}".`;
    }

    return { create, edit, install, commands, reasoning };
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
