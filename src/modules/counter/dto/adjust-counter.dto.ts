import { IsString, IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class AdjustCounterDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['INCREASE', 'DECREASE'])
  type: 'INCREASE' | 'DECREASE';

  @IsInt()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
