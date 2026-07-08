import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger('AnalyticsListener');

  @OnEvent('bill.created')
  handleBillCreated(event: any) {
    this.logger.log(`Analytics updated: sales data recorded for bill #${event.billNumber}`);
  }

  @OnEvent('purchase-order.received')
  handlePurchaseReceived(event: any) {
    this.logger.log(`Analytics updated: purchase stock value recorded for PO #${event.poNumber}`);
  }
}
