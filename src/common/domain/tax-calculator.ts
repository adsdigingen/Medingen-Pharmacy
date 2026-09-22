import { Injectable } from '@nestjs/common';

@Injectable()
export class TaxCalculator {
  calculateTaxAmount(taxableAmount: number, gstPercentage: number): number {
    return taxableAmount * (gstPercentage / 100);
  }

  calculateTaxInclusiveAmount(taxableAmount: number, gstPercentage: number): number {
    return taxableAmount + this.calculateTaxAmount(taxableAmount, gstPercentage);
  }

  extractTaxFromInclusiveAmount(inclusiveAmount: number, gstPercentage: number) {
    const taxableAmount = inclusiveAmount / (1 + gstPercentage / 100);
    const taxAmount = inclusiveAmount - taxableAmount;
    return {
      taxableAmount,
      taxAmount,
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
    };
  }
}
