import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base-worker';
import { WorkerRegistry } from './worker-registry';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationWorker extends BaseWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: WorkerRegistry,
  ) {
    super('NotificationWorker');
    this.registry.register(this);
  }

  protected async run(): Promise<void> {
    // 1. Scan for low stock
    const lowStockInventories = await this.prisma.inventory.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        product: true,
      },
    });

    const lowStockAlerts = lowStockInventories.filter(inv => inv.availableQty <= inv.product.minStockLevel);

    for (const inv of lowStockAlerts) {
      // Check if low stock notification already exists for this product in past 24 hours to prevent duplicate alerts spam
      const exists = await this.prisma.notification.findFirst({
        where: {
          type: 'LOW_STOCK',
          message: { contains: inv.product.name },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!exists) {
        await this.prisma.notification.create({
          data: {
            type: 'LOW_STOCK',
            message: `Product "${inv.product.name}" is low in stock: only ${inv.availableQty} units remaining (Minimum level: ${inv.product.minStockLevel}).`,
          },
        });
      }
    }

    // 2. Scan for near expiry batches (90 days threshold)
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + 90);

    const nearExpiryBatches = await this.prisma.batch.findMany({
      where: {
        expiryDate: { lte: thresholdDate, gte: new Date() },
        availableQty: { gt: 0 },
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        product: true,
      },
    });

    for (const batch of nearExpiryBatches) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          type: 'EXPIRY',
          message: { contains: batch.batchNumber },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // check past 7 days to prevent spam
        },
      });

      if (!exists) {
        await this.prisma.notification.create({
          data: {
            type: 'EXPIRY',
            message: `Batch "${batch.batchNumber}" of "${batch.product.name}" is near expiry (Expiring on: ${batch.expiryDate.toISOString().slice(0, 10)}).`,
          },
        });
      }
    }
  }
}
