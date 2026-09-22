import { Injectable } from '@nestjs/common';

interface OrderItem {
  purchasePrice: number;
  quantity: number;
  freeQuantity?: number;
  discountPercentage?: number;
  gstPercentage: number;
}

@Injectable()
export class PurchaseCalculationService {
  calculateItemTotal(item: OrderItem): number {
    const qty = item.quantity;
    const basePrice = item.purchasePrice * qty;
    const discount = item.discountPercentage ? (basePrice * (item.discountPercentage / 100)) : 0;
    const taxableAmount = basePrice - discount;
    const taxAmount = taxableAmount * (item.gstPercentage / 100);
    return taxableAmount + taxAmount;
  }

  calculateTotals(items: OrderItem[]) {
    let subTotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    for (const item of items) {
      const basePrice = item.purchasePrice * item.quantity;
      const discount = item.discountPercentage ? (basePrice * (item.discountPercentage / 100)) : 0;
      const taxableAmount = basePrice - discount;
      const taxAmount = taxableAmount * (item.gstPercentage / 100);

      subTotal += basePrice;
      totalDiscount += discount;
      totalTax += taxAmount;
      grandTotal += (taxableAmount + taxAmount);
    }

    return {
      subTotal,
      totalDiscount,
      totalTax,
      grandTotal,
    };
  }
}
