import { IsString, IsInt, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class TransferStockDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsInt()
  transferStrips: number;

  @IsInt()
  unitsPerStrip: number;

  @IsNumber()
  @IsOptional()
  sellingPrice?: number;
}
