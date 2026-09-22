import { Injectable } from '@nestjs/common';

@Injectable()
export class PricingEngine {
  calculateMargin(sellingPrice: number, purchasePrice: number): number {
    if (sellingPrice <= 0) return 0;
    return ((sellingPrice - purchasePrice) / sellingPrice) * 100;
  }

  calculateMarkup(sellingPrice: number, purchasePrice: number): number {
    if (purchasePrice <= 0) return 0;
    return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
  }

  calculateSellingPriceFromMargin(purchasePrice: number, targetMarginPercentage: number): number {
    if (targetMarginPercentage >= 100) return purchasePrice;
    return purchasePrice / (1 - targetMarginPercentage / 100);
  }
}
