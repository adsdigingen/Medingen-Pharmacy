import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class SyncRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findSyncSettings() {
    return this.prisma.syncSettings.findUnique({
      where: { id: 'sync_singleton' },
    });
  }

  async createSyncSettings(data: any) {
    return this.prisma.syncSettings.create({ data });
  }

  async countPendingSyncQueue() {
    return this.prisma.syncQueue.count({
      where: { syncStatus: SyncStatus.PENDING },
    });
  }

  async countFailedSyncQueue() {
    return this.prisma.syncQueue.count({
      where: { syncStatus: SyncStatus.FAILED },
    });
  }

  async countPendingConflicts() {
    return this.prisma.syncConflict.count({
      where: { resolvedAt: null },
    });
  }

  async findPendingQueueItems(take = 100) {
    return this.prisma.syncQueue.findMany({
      where: {
        syncStatus: { in: [SyncStatus.PENDING, SyncStatus.FAILED] },
      },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  async resetProcessingStatus() {
    return this.prisma.syncQueue.updateMany({
      where: { syncStatus: SyncStatus.PROCESSING },
      data: { syncStatus: SyncStatus.PENDING },
    });
  }

  async updateManyQueueStatus(ids: string[], syncStatus: SyncStatus) {
    return this.prisma.syncQueue.updateMany({
      where: { id: { in: ids } },
      data: { syncStatus },
    });
  }

  async updateQueueItem(id: string, data: any) {
    return this.prisma.syncQueue.update({
      where: { id },
      data,
    });
  }

  async createConflict(data: any) {
    return this.prisma.syncConflict.create({ data });
  }

  async updateSyncSettings(data: any) {
    return this.prisma.syncSettings.update({
      where: { id: 'sync_singleton' },
      data,
    });
  }

  async createSyncHistory(data: any) {
    return this.prisma.syncHistory.create({ data });
  }

  async findConflictById(id: string) {
    return this.prisma.syncConflict.findUnique({ where: { id } });
  }

  async createQueueItem(data: any) {
    return this.prisma.syncQueue.create({ data });
  }

  async updateConflict(id: string, data: any) {
    return this.prisma.syncConflict.update({
      where: { id },
      data,
    });
  }
}
