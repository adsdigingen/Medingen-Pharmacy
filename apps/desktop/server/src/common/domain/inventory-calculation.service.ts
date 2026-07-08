import { Injectable } from '@nestjs/common';

interface BatchQuantity {
  expiryDate: Date;
  availableQty: number;
  reservedQty: number;
  damagedQty: number;
}

@Injectable()
export class InventoryCalculationService {
  /**
   * Aggregates quantities from multiple batches to get inventory values.
   */
  aggregateInventory(batches: BatchQuantity[]) {
    let totalAvailable = 0;
    let totalReserved = 0;
    let totalDamaged = 0;
    let totalExpired = 0;
    const now = new Date();

    for (const batch of batches) {
      if (batch.expiryDate < now) {
        totalExpired += batch.availableQty;
      } else {
        totalAvailable += batch.availableQty;
      }
      totalReserved += batch.reservedQty;
      totalDamaged += batch.damagedQty;
    }

    return {
      availableQty: totalAvailable,
      reservedQty: totalReserved,
      damagedQty: totalDamaged,
      expiredQty: totalExpired,
    };
  }
}
