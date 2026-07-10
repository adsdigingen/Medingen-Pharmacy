import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class SaveSignatureDto {
  @IsString()
  @IsOptional()
  signatureImage?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['DRAWN', 'UPLOADED', 'STORED', 'EMPTY'])
  signatureType: 'DRAWN' | 'UPLOADED' | 'STORED' | 'EMPTY';
}
