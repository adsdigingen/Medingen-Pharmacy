import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PurchaseOrderCreatedEvent,
  PurchaseOrderReceivedEvent,
  PurchaseReturnCreatedEvent,
} from '../events/purchase-order.events';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PurchaseOrderListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('purchase-order.created')
  async handlePOCreated(event: PurchaseOrderCreatedEvent) {
    console.log(`[Event-Driven] PO Created: ${event.poNumber} (Items: ${event.itemCount})`);

    await this.prisma.auditLog.create({
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
        username: 'SYSTEM',
        module: 'PURCHASE_ORDERS',
        action: 'CREATE',
        device: 'Desktop Terminal',
        details: `Created Purchase Order ${event.poNumber} with ${event.itemCount} item(s)`,
      },
    }).catch(err => console.error('Failed to log audit:', err.message));
  }

  @OnEvent('purchase-order.received')
  async handlePOReceived(event: PurchaseOrderReceivedEvent) {
    console.log(`[Event-Driven] PO Received: ${event.poNumber}`);

    await this.prisma.auditLog.create({
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
        username: 'SYSTEM',
        module: 'PURCHASE_ORDERS',
        action: 'UPDATE',
        device: 'Desktop Terminal',
        details: `Marked PO ${event.poNumber} as FULLY RECEIVED. Stock integrated.`,
      },
    }).catch(err => console.error('Failed to log audit:', err.message));
  }

  @OnEvent('purchase-return.created')
  async handleReturnCreated(event: PurchaseReturnCreatedEvent) {
    console.log(`[Event-Driven] Purchase Return created for PO: ${event.poId}`);

    await this.prisma.auditLog.create({
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
        username: 'SYSTEM',
        module: 'PURCHASE_ORDERS',
        action: 'UPDATE',
        device: 'Desktop Terminal',
        details: `Created supplier return (${event.itemCount} items) for PO ${event.poId}`,
      },
    }).catch(err => console.error('Failed to log audit:', err.message));
  }
}
