import { IsString, IsNumber, IsInt, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutCounterItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsInt()
  quantity: number;

  @IsNumber()
  sellingPrice: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  @IsOptional()
  gst?: number;

  @IsNumber()
  total: number;
}

export class CheckoutCounterDto {
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsNumber()
  grandTotal: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutCounterItemDto)
  items: CheckoutCounterItemDto[];
}
