import { IsOptional, IsString, IsNumber } from 'class-validator';
import { IsMobileIN } from '../../../common/decorators/validation.decorators';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsMobileIN()
  @IsOptional()
  mobile?: string;

  @IsNumber()
  @IsOptional()
  creditBalance?: number;
}
