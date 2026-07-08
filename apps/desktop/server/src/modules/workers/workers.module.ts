import { Module, Global } from '@nestjs/common';
import { WorkerRegistry } from './worker-registry';
import { WorkersController } from './workers.controller';
import { CloudSyncWorker } from './cloud-sync.worker';
import { ExpiryScannerWorker } from './expiry-scanner.worker';
import { NotificationWorker } from './notification.worker';
import { BackupWorker } from './backup.worker';
import { PurchaseSuggestionWorker } from './purchase-suggestion.worker';
import { CleanupWorker } from './cleanup.worker';
import { MaintenanceModule } from '../maintenance/maintenance.module';

@Global()
@Module({
  imports: [MaintenanceModule],
  controllers: [WorkersController],
  providers: [
    WorkerRegistry,
    CloudSyncWorker,
    ExpiryScannerWorker,
    NotificationWorker,
    BackupWorker,
    PurchaseSuggestionWorker,
    CleanupWorker,
  ],
  exports: [WorkerRegistry],
})
export class WorkersModule {}
