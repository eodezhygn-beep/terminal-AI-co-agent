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
