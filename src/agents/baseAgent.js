export class BaseAgent {
  constructor(name) {
    if (!name) {
      throw new Error('Agent name is required.');
    }
    this.name = name;
  }

  async runTask(task) {
    throw new Error('runTask must be implemented by subclasses.');
  }
}
