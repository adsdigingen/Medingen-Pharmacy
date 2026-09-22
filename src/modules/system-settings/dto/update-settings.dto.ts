import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  storeName?: string;

  @IsString()
  @IsOptional()
  gstin?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  invoicePrefix?: string;

  @IsString()
  @IsOptional()
  poPrefix?: string;

  @IsString()
  @IsOptional()
  printerType?: string; // 58mm, 80mm

  @IsString()
  @IsOptional()
  backupInterval?: string; // DAILY, WEEKLY, MONTHLY

  @IsNumber()
  @IsOptional()
  defaultOfflineMarkup?: number;

  @IsNumber()
  @IsOptional()
  defaultOnlineMarkup?: number;

  @IsNumber()
  @IsOptional()
  defaultGst?: number;

  @IsNumber()
  @IsOptional()
  defaultRetailDiscount?: number;
}
