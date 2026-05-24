const DEFAULT_POLL_INTERVAL = 500;

export class LongRunningTaskManager {
  constructor() {
    this.tasks = new Map();
    this.nextId = 1;
  }

  createTask(name, taskFn) {
    const id = `${this.nextId++}`;
    const task = {
      id,
      name,
      status: 'pending',
      startedAt: null,
      finishedAt: null,
      result: null,
      error: null
    };

    this.tasks.set(id, task);

    Promise.resolve()
      .then(async () => {
        task.startedAt = new Date().toISOString();
        task.status = 'running';
        task.result = await taskFn();
        task.status = 'completed';
        task.finishedAt = new Date().toISOString();
      })
      .catch((error) => {
        task.error = error?.message || String(error);
        task.status = 'failed';
        task.finishedAt = new Date().toISOString();
      });

    return id;
  }

  getTask(id) {
    return this.tasks.get(id) ?? null;
  }

  listTasks() {
    return Array.from(this.tasks.values());
  }

  async waitForCompletion(id, options = {}) {
    const pollInterval = Number(options.pollInterval ?? DEFAULT_POLL_INTERVAL);
    const timeoutMs = Number(options.timeoutMs ?? 30000);
    const deadline = Date.now() + timeoutMs;

    return new Promise((resolve, reject) => {
      const tick = () => {
        const task = this.getTask(id);
        if (!task) {
          return reject(new Error(`Task not found: ${id}`));
        }
        if (['completed', 'failed'].includes(task.status)) {
          return resolve(task);
        }
        if (Date.now() > deadline) {
          task.status = 'timeout';
          return resolve(task);
        }
        setTimeout(tick, pollInterval);
      };
      tick();
    });
  }
}
