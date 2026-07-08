import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base-worker';
import { WorkerRegistry } from './worker-registry';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BatchExpiredEvent } from '../batches/events/batch.events';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class ExpiryScannerWorker extends BaseWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly registry: WorkerRegistry,
  ) {
    super('ExpiryScannerWorker');
    this.registry.register(this);
  }

  protected async run(): Promise<void> {
    const now = new Date();
    const expiredBatches = await this.prisma.batch.findMany({
      where: {
        expiryDate: { lt: now },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (expiredBatches.length === 0) return;

    this.logger.log(`Found ${expiredBatches.length} active batch(es) that have expired. Updating status...`);

    for (const batch of expiredBatches) {
      await this.prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: 'EXPIRED',
          syncStatus: SyncStatus.PENDING,
          updatedAt: now,
        },
      });

      // Update inventory aggregates
      const allProductBatches = await this.prisma.batch.findMany({
        where: { productId: batch.productId, deletedAt: null },
      });

      let totalAvailable = 0;
      let totalReserved = 0;
      let totalDamaged = 0;
      let totalExpired = 0;

      allProductBatches.forEach((b) => {
        if (b.expiryDate < now) {
          totalExpired += b.availableQty;
        } else {
          totalAvailable += b.availableQty;
        }
        totalReserved += b.reservedQty;
        totalDamaged += b.damagedQty;
      });

      await this.prisma.inventory.upsert({
        where: { productId: batch.productId },
        create: {
          productId: batch.productId,
          availableQty: totalAvailable,
          reservedQty: totalReserved,
          damagedQty: totalDamaged,
          expiredQty: totalExpired,
          syncStatus: SyncStatus.PENDING,
        },
        update: {
          availableQty: totalAvailable,
          reservedQty: totalReserved,
          damagedQty: totalDamaged,
          expiredQty: totalExpired,
          syncStatus: SyncStatus.PENDING,
          updatedAt: now,
        },
      });

      this.eventEmitter.emit(
        'batch.expired',
        new BatchExpiredEvent(batch.id, batch.productId, batch.batchNumber, batch.expiryDate),
      );
    }
  }
}
