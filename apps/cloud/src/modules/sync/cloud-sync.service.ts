import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CloudSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async processUpload(body: {
    entityName: string;
    entityId: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: string;
    localTimestamp: string;
  }) {
    const { entityName, entityId, operation, payload, localTimestamp } = body;
    const modelNameLower = entityName.toLowerCase();
    const modelDelegate = (this.prisma as any)[modelNameLower];

    if (!modelDelegate) {
      throw new Error(`Cloud database model for entity "${entityName}" not supported.`);
    }

    const payloadObj = JSON.parse(payload);
    
    const RELATION_FIELDS = new Set([
      'category', 'manufacturer', 'supplier', 'products', 'purchaseOrders', 'purchaseReturns',
      'batches', 'inventory', 'ledgerEntries', 'stockAdjustments', 'billItems',
      'purchaseOrderItems', 'purchaseReturnItems', 'holdBillItems', 'bills', 'items', 'returns',
      'bill', 'product', 'batch', 'purchaseOrder', 'customer', 'user', 'payments', 'holdBill', 'holdBillItems'
    ]);

    // Cleanse relation fields to prevent Prisma upsert errors on non-scalar fields
    for (const key of Object.keys(payloadObj)) {
      if (RELATION_FIELDS.has(key) || (payloadObj[key] !== null && typeof payloadObj[key] === 'object')) {
        delete payloadObj[key];
      }
    }
    
    // 1. Conflict Check: Retrieve cloud version of record
    const existing = await modelDelegate.findUnique({
      where: { id: entityId },
    }).catch(() => null);

    if (existing) {
      const localUpdated = new Date(payloadObj.updatedAt || localTimestamp);
      const cloudUpdated = new Date(existing.updatedAt);

      // If cloud version has a newer updatedAt timestamp, flag conflict!
      if (cloudUpdated > localUpdated) {
        return {
          status: 'CONFLICT',
          cloudRecord: existing,
        };
      }
    }

    // 2. Perform write operation in cloud DB
    if (operation === 'DELETE') {
      await modelDelegate.update({
        where: { id: entityId },
        data: { deletedAt: new Date() },
      }).catch(() => {
        return modelDelegate.delete({ where: { id: entityId } }).catch(() => null);
      });
    } else {
      // Upsert: handle inserts or updates
      await modelDelegate.upsert({
        where: { id: entityId },
        update: payloadObj,
        create: payloadObj,
      });
    }

    return { status: 'SYNCED' };
  }
}
