import { IsNotEmpty, IsString, IsArray, IsOptional, IsDateString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsDateString()
  @IsOptional()
  manufacturingDate?: string;

  @IsDateString()
  @IsNotEmpty()
  expiryDate: string;

  @IsNumber()
  purchasePrice: number;

  @IsNumber()
  sellingPrice: number;

  @IsNumber()
  mrp: number;

  @IsNumber()
  @IsOptional()
  gstPercentage?: number;

  @IsNumber()
  @IsOptional()
  discountPercentage?: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  freeQuantity?: number;

  @IsNumber()
  totalAmount: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsDateString()
  @IsNotEmpty()
  purchaseDate: string;

  @IsString()
  @IsOptional()
  supplierInvoiceNumber?: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsString()
  @IsNotEmpty()
  paymentStatus: string; // PAID, PENDING

  @IsString()
  @IsNotEmpty()
  paymentMethod: string; // CASH, UPI, CARD, CREDIT

  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string; // DRAFT, ORDERED, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string; // ORDERED, FULLY_RECEIVED, CANCELLED, etc.

  @IsString()
  @IsOptional()
  supplierInvoiceNumber?: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsString()
  @IsOptional()
  paymentStatus?: string;
}

export class ReturnItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateReturnDto {
  @IsString()
  @IsNotEmpty()
  purchaseOrderId: string;

  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsOptional()
  creditNoteNumber?: string;

  @IsDateString()
  @IsNotEmpty()
  returnDate: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
