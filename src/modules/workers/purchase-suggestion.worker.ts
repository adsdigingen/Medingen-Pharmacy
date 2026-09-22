import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base-worker';
import { WorkerRegistry } from './worker-registry';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchaseSuggestionWorker extends BaseWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: WorkerRegistry,
  ) {
    super('PurchaseSuggestionWorker');
    this.registry.register(this);
  }

  protected async run(): Promise<void> {
    const lowStockInventories = await this.prisma.inventory.findMany({
      where: { deletedAt: null },
      include: { product: true },
    });

    const lowStock = lowStockInventories.filter(inv => inv.availableQty <= inv.product.minStockLevel);

    if (lowStock.length === 0) {
      this.logger.log('No low stock products found. Suggestions are clear.');
      return;
    }

    this.logger.log(`Found ${lowStock.length} low stock product(s). Generating procurement suggestions...`);

    for (const inv of lowStock) {
      const suggestQty = Math.max(50, inv.product.minStockLevel * 2 - inv.availableQty);
      
      const exists = await this.prisma.notification.findFirst({
        where: {
          type: 'LOW_STOCK',
          message: { contains: `Procure ${suggestQty} units` },
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
      });

      if (!exists) {
        await this.prisma.notification.create({
          data: {
            type: 'LOW_STOCK',
            message: `Procurement Suggestion: Procure ${suggestQty} units of "${inv.product.name}" to maintain safety margin. Current: ${inv.availableQty}, Min: ${inv.product.minStockLevel}.`,
          },
        });
      }
    }
  }
}
