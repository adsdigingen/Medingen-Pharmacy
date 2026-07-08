import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base-worker';
import { SyncService } from '../sync/sync.service';
import { WorkerRegistry } from './worker-registry';

@Injectable()
export class CloudSyncWorker extends BaseWorker {
  constructor(
    private readonly syncService: SyncService,
    private readonly registry: WorkerRegistry,
  ) {
    super('CloudSyncWorker');
    this.registry.register(this);
  }

  protected async run(): Promise<void> {
    await this.syncService.processSyncQueue();
  }
}
