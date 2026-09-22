import { Module, Global } from '@nestjs/common';
import { PricingEngine } from './pricing.engine';
import { TaxCalculator } from './tax-calculator';
import { DiscountCalculator } from './discount-calculator';
import { BatchAllocationService } from './batch-allocation.service';
import { InventoryCalculationService } from './inventory-calculation.service';
import { ExpiryValidationService } from './expiry-validation.service';
import { StockValidationService } from './stock-validation.service';
import { PurchaseCalculationService } from './purchase-calculation.service';
import { ProfitCalculationService } from './profit-calculation.service';
import { InvoiceNumberGenerator } from './invoice-number-generator';
import { BarcodeGenerator } from './barcode-generator';
import { GSTCalculationService } from './gst-calculation.service';

@Global()
@Module({
  providers: [
    PricingEngine,
    TaxCalculator,
    DiscountCalculator,
    BatchAllocationService,
    InventoryCalculationService,
    ExpiryValidationService,
    StockValidationService,
    PurchaseCalculationService,
    ProfitCalculationService,
    InvoiceNumberGenerator,
    BarcodeGenerator,
    GSTCalculationService,
  ],
  exports: [
    PricingEngine,
    TaxCalculator,
    DiscountCalculator,
    BatchAllocationService,
    InventoryCalculationService,
    ExpiryValidationService,
    StockValidationService,
    PurchaseCalculationService,
    ProfitCalculationService,
    InvoiceNumberGenerator,
    BarcodeGenerator,
    GSTCalculationService,
  ],
})
export class DomainModule {}
