import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class AuditListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('bill.created')
  async handleBillCreated(event: any) {
    await this.log('BILLING', 'CREATE', `Bill #${event.billNumber} created. Net amount: ${event.netAmount}`);
  }

  @OnEvent('bill.cancelled')
  async handleBillCancelled(event: any) {
    await this.log('BILLING', 'UPDATE', `Bill #${event.billNumber} was cancelled. Reason: ${event.reason}`);
  }

  @OnEvent('sales.returned')
  async handleSalesReturn(event: any) {
    await this.log('BILLING', 'CREATE', `Sales return logged for Bill #${event.billNumber}. Returned items: ${event.returnedQty}`);
  }

  @OnEvent('purchase-order.created')
  async handlePurchaseOrderCreated(event: any) {
    await this.log('PURCHASES', 'CREATE', `Purchase Order #${event.poNumber} created in DRAFT.`);
  }

  @OnEvent('purchase-order.received')
  async handlePurchaseOrderReceived(event: any) {
    await this.log('PURCHASES', 'UPDATE', `Purchase Order #${event.poNumber} received. Status: ${event.status}`);
  }

  @OnEvent('purchase-return.created')
  async handlePurchaseReturnCreated(event: any) {
    await this.log('PURCHASES', 'CREATE', `Purchase Return credit note logged for PO #${event.poNumber}.`);
  }

  @OnEvent('inventory.adjusted')
  async handleStockAdjusted(event: any) {
    await this.log('INVENTORY', 'UPDATE', `Stock adjusted for batch ID: ${event.batchId}. Type: ${event.type}, Qty: ${event.quantity}, Reason: ${event.reason}`);
  }

  @OnEvent('customer.created')
  async handleCustomerCreated(event: any) {
    await this.log('CUSTOMERS', 'CREATE', `Customer "${event.name}" (${event.mobile}) was registered.`);
  }

  @OnEvent('product.created')
  async handleProductCreated(event: any) {
    await this.log('PRODUCTS', 'CREATE', `Product "${event.name}" SKU: ${event.sku || 'N/A'} was added.`);
  }

  @OnEvent('product.updated')
  async handleProductUpdated(event: any) {
    await this.log('PRODUCTS', 'UPDATE', `Product "${event.name}" was modified.`);
  }

  @OnEvent('product.import.started')
  async handleProductImportStarted(event: any) {
    await this.log('PRODUCTS', 'IMPORT', `Product import started for supplier: ${event.supplierName}. Total rows: ${event.totalRows}`);
  }

  @OnEvent('product.import.completed')
  async handleProductImportCompleted(event: any) {
    await this.log('PRODUCTS', 'IMPORT', `Product import completed for supplier: ${event.supplierName}. Success: ${event.successCount}, Errors: ${event.errorCount}`);
  }

  @OnEvent('product.import.failed')
  async handleProductImportFailed(event: any) {
    await this.log('PRODUCTS', 'IMPORT', `Product import failed for supplier: ${event.supplierName}. Error: ${event.error}`);
  }

  private async log(module: string, action: string, details: string) {
    await this.prisma.auditLog.create({
      data: {
        userId: null,
        username: 'SYSTEM',
        module,
        action,
        device: 'LOCAL_DESKTOP',
        details,
      },
    });
  }
}
