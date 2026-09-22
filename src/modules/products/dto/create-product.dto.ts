import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsNumber, IsInt } from 'class-validator';
import { IsHSNCode, IsNonNegative } from '../../../common/decorators/validation.decorators';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @IsNumber()
  @IsOptional()
  offlineMarkup?: number;

  @IsNumber()
  @IsOptional()
  offlineSellingPrice?: number;

  @IsBoolean()
  @IsOptional()
  offlineAutoCalculate?: boolean;

  @IsNumber()
  @IsOptional()
  onlineMarkup?: number;

  @IsNumber()
  @IsOptional()
  onlineSellingPrice?: number;

  @IsBoolean()
  @IsOptional()
  onlineAutoCalculate?: boolean;

  @IsNumber()
  @IsOptional()
  wholesalePrice?: number;

  @IsNumber()
  @IsOptional()
  hospitalPrice?: number;

  @IsNumber()
  @IsOptional()
  memberPrice?: number;

  @IsNumber()
  @IsOptional()
  specialOfferPrice?: number;

  @IsNumber()
  @IsOptional()
  retailDiscount?: number;

  @IsBoolean()
  @IsOptional()
  roundOff?: boolean;

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

  @IsString()
  @IsOptional()
  drugSchedule?: string;

  @IsString()
  @IsOptional()
  medicineClassification?: string;

  @IsBoolean()
  @IsOptional()
  prescriptionRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  coldChainRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  controlledDrug?: boolean;

  @IsBoolean()
  @IsOptional()
  highValueMedicine?: boolean;

  @IsString()
  @IsOptional()
  storageCondition?: string;
}
