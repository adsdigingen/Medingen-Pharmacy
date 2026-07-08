import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsEmail, IsInt, IsNumber } from 'class-validator';
import { IsGSTIN, IsMobileIN } from '../../../common/decorators/validation.decorators';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsGSTIN()
  @IsOptional()
  gstin?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsMobileIN()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsInt()
  @IsOptional()
  creditDays?: number;

  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
