import { Injectable } from '@nestjs/common';

@Injectable()
export class StockValidationService {
  hasSufficientStock(availableQty: number, requestedQty: number): boolean {
    return availableQty >= requestedQty;
  }

  isLowStock(availableQty: number, minStockLevel: number): boolean {
    return availableQty <= minStockLevel;
  }
}
