import { IsNotEmpty, IsString, IsInt, IsPositive } from 'class-validator';

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsString()
  @IsNotEmpty()
  type: string; // INCREASE, DECREASE

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string; // PHYSICAL_COUNT, DAMAGED, LOST, EXPIRED, CORRECTION

  @IsString()
  @IsNotEmpty()
  remarks: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
