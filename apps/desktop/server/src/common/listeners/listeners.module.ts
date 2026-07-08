import { Module, Global } from '@nestjs/common';
import { AuditListener } from './audit.listener';
import { LedgerListener } from './ledger.listener';
import { AnalyticsListener } from './analytics.listener';
import { NotificationListener } from './notification.listener';
import { PrintListener } from './print.listener';
import { PrintModule } from '../../modules/print/print.module';

@Global()
@Module({
  imports: [PrintModule],
  providers: [
    AuditListener,
    LedgerListener,
    AnalyticsListener,
    NotificationListener,
    PrintListener,
  ],
  exports: [
    AuditListener,
    LedgerListener,
    AnalyticsListener,
    NotificationListener,
    PrintListener,
  ],
})
export class ListenersModule {}
