import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrintService } from '../../modules/print/print.service';

@Injectable()
export class PrintListener {
  private readonly logger = new Logger('PrintListener');

  constructor(private readonly printService: PrintService) {}

  @OnEvent('bill.created')
  async handleBillPrintTrigger(event: any) {
    try {
      const receipt = await this.printService.generateReceiptText(event.billId, '80mm');
      this.logger.log(`Print slip generated for Bill #${event.billNumber} (${receipt.length} chars)`);
    } catch (e: any) {
      this.logger.error(`Failed to generate auto receipt layout: ${e.message}`);
    }
  }
}
