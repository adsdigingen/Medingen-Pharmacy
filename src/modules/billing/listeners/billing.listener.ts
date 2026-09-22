import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BillCreatedEvent, BillCancelledEvent, SalesReturnEvent } from '../events/bill-created.event';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('bill.created')
  async handleBillCreated(event: BillCreatedEvent) {
    console.log(`[Event-Driven] Bill Created: ${event.billNumber} (Amount: ₹${event.netAmount})`);
    
    // Add transaction audit log
    await this.prisma.auditLog.create({
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
        username: 'CASHIER',
        module: 'BILLING',
        action: 'CREATE',
        device: 'Desktop Terminal',
        details: `Created invoice ${event.billNumber} with net total ₹${event.netAmount}`,
      },
    }).catch(err => console.error('Failed to log audit:', err.message));
  }

  @OnEvent('bill.cancelled')
  async handleBillCancelled(event: BillCancelledEvent) {
    console.log(`[Event-Driven] Bill Cancelled: ${event.billNumber}. Reason: ${event.reason}`);

    await this.prisma.auditLog.create({
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
        username: 'CASHIER',
        module: 'BILLING',
        action: 'DELETE',
        device: 'Desktop Terminal',
        details: `Cancelled invoice ${event.billNumber}. Reason: ${event.reason}`,
      },
    }).catch(err => console.error('Failed to log audit:', err.message));
  }

  @OnEvent('sales.returned')
  async handleSalesReturned(event: SalesReturnEvent) {
    console.log(`[Event-Driven] Sales returned for bill ID: ${event.billId}`);

    await this.prisma.auditLog.create({
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
        username: 'CASHIER',
        module: 'BILLING',
        action: 'UPDATE',
        device: 'Desktop Terminal',
        details: `Processed sales return for invoice id ${event.billId}`,
      },
    }).catch(err => console.error('Failed to log audit:', err.message));
  }
}
