import { IsNotEmpty, IsString } from 'class-validator';
import { IsMobileIN } from '../../../common/decorators/validation.decorators';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsMobileIN()
  @IsNotEmpty()
  mobile: string;
}
