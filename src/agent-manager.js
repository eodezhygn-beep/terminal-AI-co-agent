export class AgentManager {
  constructor() {
    this.agents = new Map();
    this.taskHistory = [];
  }

  registerAgent(agent) {
    if (!agent || !agent.name) {
      throw new Error('Agent must have a name.');
    }
    this.agents.set(agent.name, agent);
  }

  getAgent(name) {
    return this.agents.get(name);
  }

  listAgents() {
    return Array.from(this.agents.values());
  }

  async runTask(agentName, task) {
    const agent = this.getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    const result = await agent.runTask(task);
    this.taskHistory.push({ agentName, task, result, timestamp: new Date().toISOString() });
    return result;
  }

  getTaskHistory() {
    return [...this.taskHistory];
  }
}
