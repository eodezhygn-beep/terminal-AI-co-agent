import { BaseAgent } from './baseAgent.js';

export class SimpleAgent extends BaseAgent {
  constructor(name, handler) {
    super(name);
    this.handler = handler;
  }

  async runTask(task) {
    if (typeof this.handler !== 'function') {
      throw new Error('SimpleAgent handler must be a function.');
    }
    return this.handler(task);
  }
}
