import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const categories = await this.prisma.category.count();
      const products = await this.prisma.product.count();
      const bills = await this.prisma.bill.count();

      return {
        status: 'HEALTHY',
        database: 'PostgreSQL',
        metrics: {
          categoriesCount: categories,
          productsCount: products,
          billsCount: bills,
        },
      };
    } catch (e: any) {
      return {
        status: 'UNHEALTHY',
        error: e.message,
      };
    }
  }

  async optimize() {
    // Reindex & vacuum tables to keep database fast
    // Since PostgreSQL vacuum cannot be executed inside a multi-statement transaction or standard client wrapper sometimes, we run REINDEX
    await this.prisma.$executeRawUnsafe(`REINDEX TABLE categories;`);
    await this.prisma.$executeRawUnsafe(`REINDEX TABLE manufacturers;`);
    await this.prisma.$executeRawUnsafe(`REINDEX TABLE suppliers;`);
    await this.prisma.$executeRawUnsafe(`REINDEX TABLE products;`);
    await this.prisma.$executeRawUnsafe(`REINDEX TABLE batches;`);
    await this.prisma.$executeRawUnsafe(`REINDEX TABLE bills;`);

    return {
      status: 'OPTIMIZATION_COMPLETED',
      actions: ['Reindexing completed on active tables'],
    };
  }

  async backupDatabase() {
    // JSON Backup: exports all configurations cleanly
    const [
      categories, manufacturers, suppliers, customers, products, batches,
      inventories, stockLedgers, stockAdjustments, purchaseOrders, purchaseOrderItems,
      purchaseReturns, purchaseReturnItems, bills, billItems, payments,
      syncQueues, syncConflicts, syncHistories, notifications, settings,
      syncSettings, holdBills, holdBillItems, auditLogs
    ] = await Promise.all([
      this.prisma.category.findMany(),
      this.prisma.manufacturer.findMany(),
      this.prisma.supplier.findMany(),
      this.prisma.customer.findMany(),
      this.prisma.product.findMany(),
      this.prisma.batch.findMany(),
      this.prisma.inventory.findMany(),
      this.prisma.stockLedger.findMany(),
      this.prisma.stockAdjustment.findMany(),
      this.prisma.purchaseOrder.findMany(),
      this.prisma.purchaseOrderItem.findMany(),
      this.prisma.purchaseReturn.findMany(),
      this.prisma.purchaseReturnItem.findMany(),
      this.prisma.bill.findMany(),
      this.prisma.billItem.findMany(),
      this.prisma.payment.findMany(),
      this.prisma.syncQueue.findMany(),
      this.prisma.syncConflict.findMany(),
      this.prisma.syncHistory.findMany(),
      this.prisma.notification.findMany(),
      this.prisma.systemSettings.findMany(),
      this.prisma.syncSettings.findMany(),
      this.prisma.holdBill.findMany(),
      this.prisma.holdBillItem.findMany(),
      this.prisma.auditLog.findMany(),
    ]);

    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        categories, manufacturers, suppliers, customers, products, batches,
        inventories, stockLedgers, stockAdjustments, purchaseOrders, purchaseOrderItems,
        purchaseReturns, purchaseReturnItems, bills, billItems, payments,
        syncQueues, syncConflicts, syncHistories, notifications, settings,
        syncSettings, holdBills, holdBillItems, auditLogs
      },
    };

    // Update settings last backup timestamp
    await this.prisma.systemSettings.updateMany({
      data: { lastBackupAt: new Date() },
    });

    return backupData;
  }

  async restoreDatabase(backupObj: any) {
    if (!backupObj) {
      throw new Error("Invalid backup data format.");
    }

    let source = backupObj.data;
    if (source && source.data) {
      source = source.data;
    }

    if (!source) {
      throw new Error("Invalid backup data payload.");
    }

    const {
      categories, manufacturers, suppliers, customers, products, batches,
      inventories, stockLedgers, stockAdjustments, purchaseOrders, purchaseOrderItems,
      purchaseReturns, purchaseReturnItems, bills, billItems, payments,
      syncQueues, syncConflicts, syncHistories, notifications, settings,
      syncSettings, holdBills, holdBillItems, auditLogs
    } = source;

    return this.prisma.$transaction(async (tx) => {
      // Clean target tables in dependency-safe order
      await tx.auditLog.deleteMany();
      await tx.syncHistory.deleteMany();
      await tx.syncConflict.deleteMany();
      await tx.syncQueue.deleteMany();
      await tx.notification.deleteMany();

      await tx.holdBillItem.deleteMany();
      await tx.holdBill.deleteMany();

      await tx.payment.deleteMany();
      await tx.billItem.deleteMany();
      await tx.bill.deleteMany();

      await tx.purchaseReturnItem.deleteMany();
      await tx.purchaseReturn.deleteMany();

      await tx.purchaseOrderItem.deleteMany();
      await tx.purchaseOrder.deleteMany();

      await tx.stockLedger.deleteMany();
      await tx.stockAdjustment.deleteMany();
      await tx.inventory.deleteMany();
      await tx.batch.deleteMany();
      await tx.product.deleteMany();

      await tx.customer.deleteMany();
      await tx.supplier.deleteMany();
      await tx.manufacturer.deleteMany();
      await tx.category.deleteMany();
      await tx.systemSettings.deleteMany();
      await tx.syncSettings.deleteMany();

      // Seed core configs
      if (categories && categories.length > 0) {
        await tx.category.createMany({ data: categories });
      }
      if (manufacturers && manufacturers.length > 0) {
        await tx.manufacturer.createMany({ data: manufacturers });
      }
      if (suppliers && suppliers.length > 0) {
        await tx.supplier.createMany({ data: suppliers });
      }
      if (customers && customers.length > 0) {
        await tx.customer.createMany({ data: customers });
      }

      // Seed products & batches
      if (products && products.length > 0) {
        await tx.product.createMany({ data: products });
      }
      if (batches && batches.length > 0) {
        await tx.batch.createMany({ data: batches });
      }
      if (inventories && inventories.length > 0) {
        await tx.inventory.createMany({ data: inventories });
      }

      // Seed inventory history & details
      if (stockLedgers && stockLedgers.length > 0) {
        await tx.stockLedger.createMany({ data: stockLedgers });
      }
      if (stockAdjustments && stockAdjustments.length > 0) {
        await tx.stockAdjustment.createMany({ data: stockAdjustments });
      }

      // Seed purchases
      if (purchaseOrders && purchaseOrders.length > 0) {
        await tx.purchaseOrder.createMany({ data: purchaseOrders });
      }
      if (purchaseOrderItems && purchaseOrderItems.length > 0) {
        await tx.purchaseOrderItem.createMany({ data: purchaseOrderItems });
      }
      if (purchaseReturns && purchaseReturns.length > 0) {
        await tx.purchaseReturn.createMany({ data: purchaseReturns });
      }
      if (purchaseReturnItems && purchaseReturnItems.length > 0) {
        await tx.purchaseReturnItem.createMany({ data: purchaseReturnItems });
      }

      // Seed bills & payments
      if (bills && bills.length > 0) {
        await tx.bill.createMany({ data: bills });
      }
      if (billItems && billItems.length > 0) {
        await tx.billItem.createMany({ data: billItems });
      }
      if (payments && payments.length > 0) {
        await tx.payment.createMany({ data: payments });
      }

      // Seed hold bills
      if (holdBills && holdBills.length > 0) {
        await tx.holdBill.createMany({ data: holdBills });
      }
      if (holdBillItems && holdBillItems.length > 0) {
        await tx.holdBillItem.createMany({ data: holdBillItems });
      }

      // Seed metadata tables
      if (syncQueues && syncQueues.length > 0) {
        await tx.syncQueue.createMany({ data: syncQueues });
      }
      if (syncConflicts && syncConflicts.length > 0) {
        await tx.syncConflict.createMany({ data: syncConflicts });
      }
      if (syncHistories && syncHistories.length > 0) {
        await tx.syncHistory.createMany({ data: syncHistories });
      }
      if (notifications && notifications.length > 0) {
        await tx.notification.createMany({ data: notifications });
      }
      if (auditLogs && auditLogs.length > 0) {
        await tx.auditLog.createMany({ data: auditLogs });
      }

      // Restore settings
      if (settings && settings.length > 0) {
        await tx.systemSettings.createMany({ data: settings });
      }
      if (syncSettings && syncSettings.length > 0) {
        await tx.syncSettings.createMany({ data: syncSettings });
      }

      return { status: 'RESTORE_SUCCESSFUL' };
    }, { timeout: 60000, maxWait: 10000 });
  }
}
