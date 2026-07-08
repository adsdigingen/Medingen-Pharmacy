import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base-worker';
import { WorkerRegistry } from './worker-registry';
import { PrismaService } from '../prisma/prisma.service';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class CleanupWorker extends BaseWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: WorkerRegistry,
  ) {
    super('CleanupWorker');
    this.registry.register(this);
  }

  protected async run(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Purge synced queue items older than 30 days
    const queueResult = await this.prisma.syncQueue.deleteMany({
      where: {
        syncStatus: SyncStatus.SYNCED,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    // 2. Purge audit logs older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const auditResult = await this.prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: ninetyDaysAgo },
      },
    });

    this.logger.log(
      `Database cleanup completed. Synced queue items deleted: ${queueResult.count}. Audit logs purged: ${auditResult.count}.`
    );
  }
}
