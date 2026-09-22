import { Injectable } from '@nestjs/common';

@Injectable()
export class BarcodeGenerator {
  generateInternalBarcode(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MED${timestamp}${random}`;
  }
}
