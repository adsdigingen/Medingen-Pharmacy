import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MedingenCustomerDto } from './medingen-customer.dto';
import { MedingenBillItemDto } from './medingen-bill-item.dto';
import { MedingenPaymentDto } from './medingen-payment.dto';

export class CreateMedingenBillDto {
  @IsString()
  @IsNotEmpty({ message: 'orderId is required' })
  orderId: string;

  @ValidateNested()
  @Type(() => MedingenCustomerDto)
  @IsNotEmpty({ message: 'customer object is required' })
  customer: MedingenCustomerDto;

  @IsArray({ message: 'items must be an array' })
  @ArrayMinSize(1, { message: 'items array must contain at least 1 item' })
  @ValidateNested({ each: true })
  @Type(() => MedingenBillItemDto)
  items: MedingenBillItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MedingenPaymentDto)
  payment?: MedingenPaymentDto;
}
