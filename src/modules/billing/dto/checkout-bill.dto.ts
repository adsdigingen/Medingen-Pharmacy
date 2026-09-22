import { IsNotEmpty, IsString, IsArray, IsOptional, IsNumber, ValidateNested, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountPercentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  customPrice?: number;
}

export class PaymentSplitDto {
  @IsString()
  @IsNotEmpty()
  method: string; // CASH, UPI, CARD

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  referenceNumber?: string;
}

export class CheckoutBillDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerMobile?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string; // CASH, UPI, CARD, MIXED, CREDIT

  @IsString()
  @IsNotEmpty()
  paymentStatus: string; // PAID, PENDING

  @IsNumber()
  @Min(0)
  amountPaid: number;

  @IsString()
  @IsNotEmpty()
  invoiceType: string; // TAX, RETAIL

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitDto)
  payments?: PaymentSplitDto[];

  @IsString()
  @IsOptional()
  holdBillId?: string;

  @IsString()
  @IsOptional()
  doctorName?: string;
}

export class HoldBillDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerMobile?: string;

  @IsString()
  @IsOptional()
  holdLabel?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}

export class SalesReturnItemDto {
  @IsString()
  @IsNotEmpty()
  billItemId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class SalesReturnDto {
  @IsString()
  @IsNotEmpty()
  billId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReturnItemDto)
  items: SalesReturnItemDto[];
}
