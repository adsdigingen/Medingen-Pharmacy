import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MedingenPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'payment.method is required' })
  method: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'payment.amount must be a number' })
  @IsPositive({ message: 'payment.amount must be greater than 0' })
  amount?: number;
}
