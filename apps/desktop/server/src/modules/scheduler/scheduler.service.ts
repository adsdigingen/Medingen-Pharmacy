import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkerRegistry } from '../workers/worker-registry';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly registry: WorkerRegistry) {}

  // CloudSync runs every 15 seconds
  @Cron('*/15 * * * * *')
  async runCloudSync() {
    this.logger.debug('Scheduled Trigger: CloudSyncWorker');
    const worker = this.registry.getWorker('CloudSyncWorker');
    if (worker) await worker.execute();
  }

  // NotificationWorker runs every 5 minutes
  @Cron('*/5 * * * *')
  async runNotifications() {
    this.logger.debug('Scheduled Trigger: NotificationWorker');
    const worker = this.registry.getWorker('NotificationWorker');
    if (worker) await worker.execute();
  }

  // ExpiryScanner runs daily at 2:00 AM
  @Cron('0 2 * * *')
  async runExpiryScanner() {
    this.logger.log('Scheduled Trigger: ExpiryScannerWorker');
    const worker = this.registry.getWorker('ExpiryScannerWorker');
    if (worker) await worker.execute();
  }

  // BackupWorker runs daily at 3:00 AM
  @Cron('0 3 * * *')
  async runBackup() {
    this.logger.log('Scheduled Trigger: BackupWorker');
    const worker = this.registry.getWorker('BackupWorker');
    if (worker) await worker.execute();
  }

  // PurchaseSuggestionWorker runs daily at 6:00 AM
  @Cron('0 6 * * *')
  async runPurchaseSuggestions() {
    this.logger.log('Scheduled Trigger: PurchaseSuggestionWorker');
    const worker = this.registry.getWorker('PurchaseSuggestionWorker');
    if (worker) await worker.execute();
  }

  // CleanupWorker runs weekly (Sundays at 4:00 AM)
  @Cron('0 4 * * 0')
  async runCleanup() {
    this.logger.log('Scheduled Trigger: CleanupWorker');
    const worker = this.registry.getWorker('CleanupWorker');
    if (worker) await worker.execute();
  }
}
