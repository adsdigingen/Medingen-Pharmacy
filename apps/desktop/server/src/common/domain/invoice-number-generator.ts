import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceNumberGenerator {
  generateInvoiceNumber(prefix: string, lastInvoiceNumber?: string): string {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const currentPrefix = `${prefix}${todayStr}-`;

    if (lastInvoiceNumber && lastInvoiceNumber.startsWith(currentPrefix)) {
      const parts = lastInvoiceNumber.split('-');
      const sequence = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(sequence)) {
        const nextSequence = String(sequence + 1).padStart(4, '0');
        return `${currentPrefix}${nextSequence}`;
      }
    }

    return `${currentPrefix}0001`;
  }
}
