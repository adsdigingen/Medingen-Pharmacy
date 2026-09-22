import { Injectable } from '@nestjs/common';

@Injectable()
export class ProfitCalculationService {
  calculateItemProfit(sellingPrice: number, purchasePrice: number, quantity: number): number {
    return (sellingPrice - purchasePrice) * quantity;
  }

  calculateProfitPercentage(sellingPrice: number, purchasePrice: number): number {
    if (purchasePrice <= 0) return 0;
    return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
  }
}
