import { Module, Global } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncQueueService } from './sync-queue.service';

import { SyncRepository } from './repository/sync.repository';

@Global()
@Module({
  controllers: [SyncController],
  providers: [SyncService, SyncQueueService, SyncRepository],
  exports: [SyncService, SyncQueueService, SyncRepository],
})
export class SyncModule {}
