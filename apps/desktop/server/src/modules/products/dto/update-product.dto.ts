import { IsString, IsBoolean, IsOptional, IsNumber, IsInt } from 'class-validator';
import { IsHSNCode, IsNonNegative } from '../../../common/decorators/validation.decorators';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  genericName?: string;

  @IsString()
  @IsOptional()
  brandName?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  manufacturerId?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsHSNCode()
  @IsOptional()
  hsnCode?: string;

  @IsNonNegative()
  @IsOptional()
  gstPercentage?: number;

  @IsNonNegative()
  @IsOptional()
  purchasePrice?: number;

  @IsNonNegative()
  @IsOptional()
  sellingPrice?: number;

  @IsNonNegative()
  @IsOptional()
  mrp?: number;

  @IsInt()
  @IsOptional()
  minStockLevel?: number;

  @IsString()
  @IsOptional()
  rackLocation?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
