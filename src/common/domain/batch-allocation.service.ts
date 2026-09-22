import { Injectable } from '@nestjs/common';

interface AllocatableBatch {
  id: string;
  batchNumber: string;
  expiryDate: Date;
  availableQty: number;
}

@Injectable()
export class BatchAllocationService {
  /**
   * Sorts and selects batches based on FEFO (First Expiring First Out).
   */
  allocateBatches(batches: AllocatableBatch[], requestedQty: number): Array<{ batchId: string; batchNumber: string; allocatedQty: number }> {
    const sorted = [...batches].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    let remaining = requestedQty;
    const allocation: Array<{ batchId: string; batchNumber: string; allocatedQty: number }> = [];

    for (const batch of sorted) {
      if (remaining <= 0) break;
      if (batch.availableQty <= 0) continue;

      const take = Math.min(batch.availableQty, remaining);
      allocation.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        allocatedQty: take,
      });
      remaining -= take;
    }

    if (remaining > 0) {
      throw new Error(`Insufficient stock available to allocate the complete quantity of ${requestedQty}.`);
    }

    return allocation;
  }
}
