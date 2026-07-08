import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base-worker';
import { WorkerRegistry } from './worker-registry';
import { MaintenanceService } from '../maintenance/maintenance.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class BackupWorker extends BaseWorker {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly registry: WorkerRegistry,
  ) {
    super('BackupWorker');
    this.registry.register(this);
  }

  protected async run(): Promise<void> {
    const backupData = await this.maintenanceService.backupDatabase();
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Ensure backups directory exists
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf-8');
    this.logger.log(`Database backup saved successfully to: ${filepath}`);
  }
}
