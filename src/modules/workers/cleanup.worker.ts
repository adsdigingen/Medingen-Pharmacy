import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base-worker';
import { WorkerRegistry } from './worker-registry';
import { PrismaService } from '../prisma/prisma.service';

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
    // Purge audit logs older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const auditResult = await this.prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: ninetyDaysAgo },
      },
    });

    this.logger.log(
      `Database cleanup completed. Audit logs purged: ${auditResult.count}.`,
    );
  }
}
