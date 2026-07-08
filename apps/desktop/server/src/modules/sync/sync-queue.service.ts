import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class SyncQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(entityName: string, entityId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', payload: any) {
    return this.prisma.syncQueue.create({
      data: {
        entityName,
        entityId,
        operation,
        payload: JSON.stringify(payload),
        syncStatus: SyncStatus.PENDING,
      },
    });
  }
}
