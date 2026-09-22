import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscountCalculator {
  calculateDiscountAmount(amount: number, discountPercentage: number): number {
    if (discountPercentage <= 0) return 0;
    return amount * (Math.min(discountPercentage, 100) / 100);
  }

  applyDiscount(amount: number, discountPercentage: number): number {
    return amount - this.calculateDiscountAmount(amount, discountPercentage);
  }
}
