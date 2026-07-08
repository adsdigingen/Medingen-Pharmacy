import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class NotificationListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('inventory.adjusted')
  async handleLowStockCheck(event: any) {
    const inv = await this.prisma.inventory.findFirst({
      where: { productId: event.productId },
      include: { product: true },
    });

    if (inv && inv.availableQty <= inv.product.minStockLevel) {
      await this.prisma.notification.create({
        data: {
          type: 'LOW_STOCK',
          message: `Stock level of "${inv.product.name}" is low (${inv.availableQty} units left).`,
        },
      });
    }
  }

  @OnEvent('batch.expired')
  async handleBatchExpired(event: any) {
    await this.prisma.notification.create({
      data: {
        type: 'EXPIRY',
        message: `Batch "${event.batchNumber}" has expired. Available units must not be sold.`,
      },
    });
  }

  @OnEvent('sync.failed')
  async handleSyncFailed(event: any) {
    await this.prisma.notification.create({
      data: {
        type: 'SYNC_FAIL',
        message: `Cloud database synchronization failed: ${event.errorMsg}`,
      },
    });
  }
}
