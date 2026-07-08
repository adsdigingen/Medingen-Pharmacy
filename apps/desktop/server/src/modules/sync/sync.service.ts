import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncStatus } from '@medingen/db';
import { SyncRepository } from './repository/sync.repository';

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private syncTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: SyncRepository,
  ) {}

  async onModuleInit() {
    await this.initSyncSettings();
    await this.recoverStuckProcessingItems();
  }

  onModuleDestroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }

  private async initSyncSettings() {
    const settings = await this.repo.findSyncSettings();
    if (!settings) {
      await this.repo.createSyncSettings({
        id: 'sync_singleton',
        cloudApiUrl: 'http://localhost:3002',
        syncIntervalMs: 15000, // 15 seconds for snappier offline-first testing
        syncEnabled: true,
      });
    }
  }

  private async recoverStuckProcessingItems() {
    try {
      const result = await this.repo.resetProcessingStatus();
      if (result.count > 0) {
        console.log(`[SyncService] Recovered ${result.count} stuck PROCESSING queue item(s) to PENDING status.`);
      }
    } catch (e: any) {
      console.error('[SyncService] Failed to recover stuck processing items:', e.message);
    }
  }

  async getSyncStatus() {
    const settings = await this.repo.findSyncSettings();
    const pending = await this.repo.countPendingSyncQueue();
    const failed = await this.repo.countFailedSyncQueue();
    const conflicts = await this.repo.countPendingConflicts();

    // Test internet check
    let internetConnected = false;
    try {
      const res = await fetch(`${settings?.cloudApiUrl || 'http://localhost:3002'}/sync/health`);
      if (res.ok) internetConnected = true;
    } catch (e) {
      internetConnected = false;
    }

    return {
      internetConnected,
      pendingCount: pending,
      failedCount: failed,
      conflictsCount: conflicts,
      lastSuccessfulSync: settings?.lastSuccessfulSync || null,
      syncEnabled: settings?.syncEnabled ?? true,
    };
  }

  async processSyncQueue() {
    if (this.isProcessing) return;
    
    const settings = await this.repo.findSyncSettings();
    if (!settings || !settings.syncEnabled) return;

    this.isProcessing = true;

    try {
      // 1. Check cloud connection
      const healthRes = await fetch(`${settings.cloudApiUrl}/sync/health`).catch(() => null);
      if (!healthRes || !healthRes.ok) {
        this.isProcessing = false;
        return;
      }

      // 2. Fetch pool of pending/failed items (up to 100)
      const rawItems = await this.repo.findPendingQueueItems(100);

      if (rawItems.length === 0) {
        this.isProcessing = false;
        return;
      }

      const now = Date.now();
      const eligibleItems = rawItems.filter((item) => {
        if (item.syncStatus === SyncStatus.PENDING) {
          return true;
        }
        if (item.syncStatus === SyncStatus.FAILED) {
          // Exponential backoff delay: 15s * 2^retryCount, up to a max of 1 hour (3600000ms)
          const backoffDelayMs = Math.min(3600000, 15000 * Math.pow(2, item.retryCount));
          const lastAttemptTime = item.createdAt.getTime();
          return now - lastAttemptTime >= backoffDelayMs;
        }
        return false;
      });

      if (eligibleItems.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Process up to 30 items in this batch
      const pendingItems = eligibleItems.slice(0, 30);

      // Mark items as PROCESSING
      const ids = pendingItems.map(it => it.id);
      await this.repo.updateManyQueueStatus(ids, SyncStatus.PROCESSING);

      let successfulSyncs = 0;

      const registration = await this.getOrCreateDeviceRegistration();

      for (const item of pendingItems) {
        try {
          const res = await fetch(`${settings.cloudApiUrl}/sync/upload`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-device-uuid': registration.deviceUuid,
              'x-api-key': registration.apiKey,
            },
            body: JSON.stringify({
              entityName: item.entityName,
              entityId: item.entityId,
              operation: item.operation,
              payload: item.payload,
              localTimestamp: item.createdAt,
            }),
          });

          if (res.ok) {
            const body = await res.json();
            if (body.status === 'SYNCED') {
              await this.repo.updateQueueItem(item.id, {
                syncStatus: SyncStatus.SYNCED,
                syncedAt: new Date(),
              });
              successfulSyncs++;
            } else if (body.status === 'CONFLICT') {
              // Log local conflict
              await this.repo.updateQueueItem(item.id, { syncStatus: SyncStatus.CONFLICT });
              
              await this.repo.createConflict({
                entityName: item.entityName,
                entityId: item.entityId,
                localPayload: item.payload,
                cloudPayload: JSON.stringify(body.cloudRecord || {}),
              });
            }
          } else {
            throw new Error(`Cloud server returned error: ${res.statusText}`);
          }
        } catch (e: any) {
          await this.repo.updateQueueItem(item.id, {
            syncStatus: SyncStatus.FAILED,
            retryCount: item.retryCount + 1,
            lastError: e.message,
            createdAt: new Date(), // Update timestamp to track last attempt for backoff
          });
        }
      }

      if (successfulSyncs > 0) {
        await this.repo.updateSyncSettings({ lastSuccessfulSync: new Date() });

        await this.repo.createSyncHistory({
          batchSize: successfulSyncs,
          status: 'SUCCESS',
        });
      }
    } catch (err: any) {
      console.error('Background sync runner error:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  async resolveConflict(conflictId: string, resolution: 'LOCAL_WINS' | 'CLOUD_WINS') {
    const conflict = await this.repo.findConflictById(conflictId);
    if (!conflict) throw new Error("Conflict record not found.");

    if (resolution === 'LOCAL_WINS') {
      // Re-enqueue the local write by inserting it back into SyncQueue to force re-upload
      await this.repo.createQueueItem({
        entityName: conflict.entityName,
        entityId: conflict.entityId,
        operation: 'UPDATE',
        payload: conflict.localPayload,
        syncStatus: SyncStatus.PENDING,
      });
    } else {
      // Overwrite the local record with the cloud's payload content
      const payloadObj = JSON.parse(conflict.cloudPayload);
      const modelDelegate = (this.prisma as any)[conflict.entityName.toLowerCase()];
      if (modelDelegate) {
        await modelDelegate.upsert({
          where: { id: conflict.entityId },
          update: payloadObj,
          create: payloadObj,
        });
      }
    }

    // Mark conflict resolved
    return this.repo.updateConflict(conflictId, {
      resolvedAt: new Date(),
      resolution,
    });
  }

  async forceTrigger() {
    await this.processSyncQueue();
    return this.getSyncStatus();
  }

  private async getOrCreateDeviceRegistration() {
    let registration = await this.prisma.deviceRegistration.findFirst();
    if (!registration) {
      registration = await this.prisma.deviceRegistration.create({
        data: {
          storeName: 'Medingen Pharmacy (Default Terminal)',
          deviceUuid: 'default-desktop-uuid',
          apiKey: 'default-sync-api-key',
        },
      });
    }
    return registration;
  }
}
