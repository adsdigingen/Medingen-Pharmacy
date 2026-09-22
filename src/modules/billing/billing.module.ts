import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

import { BillingRepository } from './repository/billing.repository';
import { BillingListener } from './listeners/billing.listener';

@Module({
  controllers: [BillingController],
  providers: [BillingService, BillingRepository, BillingListener],
  exports: [BillingService, BillingRepository],
})
export class BillingModule {}
