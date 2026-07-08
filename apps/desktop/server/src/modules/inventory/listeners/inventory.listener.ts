import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StockAdjustedEvent } from '../events/inventory.events';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('inventory.adjusted')
  async handleStockAdjusted(event: StockAdjustedEvent) {
    console.log(`[Event-Driven] Stock adjusted: Batch ${event.batchId}, ${event.type} ${event.quantity} (Reason: ${event.reason})`);

    await this.prisma.auditLog.create({
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
        username: 'SYSTEM',
        module: 'INVENTORY',
        action: 'UPDATE',
        device: 'Desktop Terminal',
        details: `Stock adjustment: ${event.type} ${event.quantity} units for batch ${event.batchId}. Reason: ${event.reason}`,
      },
    }).catch(err => console.error('Failed to log audit:', err.message));
  }
}
