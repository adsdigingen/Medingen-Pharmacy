import { Injectable } from '@nestjs/common';

@Injectable()
export class GSTCalculationService {
  calculateGSTReport(salesGst: number, purchaseGst: number) {
    const netGstPayable = salesGst - purchaseGst;
    return {
      outputGst: salesGst,
      inputGst: purchaseGst,
      cgstPayable: netGstPayable > 0 ? netGstPayable / 2 : 0,
      sgstPayable: netGstPayable > 0 ? netGstPayable / 2 : 0,
      netGstPayable,
    };
  }
}
