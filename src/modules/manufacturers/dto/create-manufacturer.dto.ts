import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsEmail } from 'class-validator';

export class CreateManufacturerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
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
  gstNumber?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
