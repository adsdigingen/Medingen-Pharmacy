import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MedingenBillItemDto {
  @IsString()
  @IsNotEmpty({ message: 'items.productId is required' })
  productId: string;

  @Type(() => Number)
  @IsInt({ message: 'items.quantity must be an integer' })
  @IsPositive({ message: 'items.quantity must be greater than 0' })
  quantity: number;
}
