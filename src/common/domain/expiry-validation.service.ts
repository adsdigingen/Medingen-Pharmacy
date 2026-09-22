import { Injectable } from '@nestjs/common';

@Injectable()
export class ExpiryValidationService {
  isExpired(expiryDate: Date): boolean {
    return expiryDate.getTime() < new Date().getTime();
  }

  isNearExpiry(expiryDate: Date, thresholdDays = 90): boolean {
    if (this.isExpired(expiryDate)) return false;
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    return expiryDate.getTime() <= new Date().getTime() + thresholdMs;
  }
}
