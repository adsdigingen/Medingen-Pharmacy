import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MedingenCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'customer.name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'customer.phone is required' })
  phone: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
