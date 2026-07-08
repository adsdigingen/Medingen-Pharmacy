import { Module } from '@nestjs/common';
import { CloudSyncService } from './cloud-sync.service';
import { CloudSyncController } from './cloud-sync.controller';

@Module({
  controllers: [CloudSyncController],
  providers: [CloudSyncService],
  exports: [CloudSyncService],
})
export class CloudSyncModule {}
