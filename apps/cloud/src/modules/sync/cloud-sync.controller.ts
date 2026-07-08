import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CloudSyncService } from './cloud-sync.service';
import { ApiKeyGuard } from './api-key.guard';

@Controller('sync')
export class CloudSyncController {
  constructor(private readonly syncService: CloudSyncService) {}

  @Get('health')
  healthCheck() {
    return { status: 'OK', message: 'Cloud synchronization service online.' };
  }

  @Post('upload')
  @UseGuards(ApiKeyGuard)
  uploadTransaction(
    @Body() body: {
      entityName: string;
      entityId: string;
      operation: 'CREATE' | 'UPDATE' | 'DELETE';
      payload: string;
      localTimestamp: string;
    },
  ) {
    return this.syncService.processUpload(body);
  }
}
