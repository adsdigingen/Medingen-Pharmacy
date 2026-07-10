import { IsString, IsOptional } from 'class-validator';

export class VerifyRegisterDto {
  @IsString()
  @IsOptional()
  patientName?: string;

  @IsString()
  @IsOptional()
  doctorName?: string;

  @IsString()
  @IsOptional()
  prescriptionNumber?: string;
}
