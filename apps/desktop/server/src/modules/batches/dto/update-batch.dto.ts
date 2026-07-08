import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateBatchDto {
  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @IsNumber()
  @IsOptional()
  sellingPrice?: number;

  @IsNumber()
  @IsOptional()
  mrp?: number;

  @IsString()
  @IsOptional()
  status?: string; // ACTIVE, EXPIRED, EXHAUSTED, DAMAGED
}
