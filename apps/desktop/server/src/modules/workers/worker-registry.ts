import { Injectable, OnModuleInit } from '@nestjs/common';
import { BaseWorker } from './base-worker';

@Injectable()
export class WorkerRegistry implements OnModuleInit {
  private readonly workers = new Map<string, BaseWorker>();

  onModuleInit() {}

  register(worker: BaseWorker) {
    this.workers.set(worker.name.toLowerCase(), worker);
  }

  getWorker(name: string): BaseWorker | undefined {
    return this.workers.get(name.toLowerCase());
  }

  getAllWorkers(): BaseWorker[] {
    return Array.from(this.workers.values());
  }
}
