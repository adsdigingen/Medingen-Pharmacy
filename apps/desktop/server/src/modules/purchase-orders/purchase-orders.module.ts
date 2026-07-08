import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrderListener } from './listeners/purchase-order.listener';

import { PurchaseRepository } from './repository/purchase.repository';

@Module({
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PurchaseRepository, PurchaseOrderListener],
  exports: [PurchaseOrdersService, PurchaseRepository],
})
export class PurchaseOrdersModule {}
