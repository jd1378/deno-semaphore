export class Semaphore {
  private tasks: (() => void)[] = [];
  count: number;

  constructor(count: number) {
    this.count = count;
  }

  private schedule() {
    if (this.count > 0 && this.tasks.length > 0) {
      this.count--;
      const next = this.tasks.shift();
      if (next === undefined) {
        throw "Unexpected undefined value in tasks list";
      }
      next();
    }
  }

  /** returns current scheduled tasks length */
  get length(): number {
    return this.tasks.length;
  }

  public acquire() {
    return new Promise<() => void>((resolve) => {
      const task = () => {
        let released = false;
        resolve(() => {
          if (!released) {
            released = true;
            this.count++;
            this.schedule();
          }
        });
      };
      this.tasks.push(task);
      queueMicrotask(this.schedule.bind(this));
    });
  }

  public async use<T>(fn: () => Promise<T>) {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
