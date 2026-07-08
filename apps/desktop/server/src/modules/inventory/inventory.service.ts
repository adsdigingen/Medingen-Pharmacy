import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { SyncStatus } from '@medingen/db';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StockAdjustedEvent } from './events/inventory.events';
import { InventoryRepository } from './repository/inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly repo: InventoryRepository,
  ) {}

  async findAll(query: { search?: string; lowStock?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const queryWhere: any = { deletedAt: null };
    if (query.search) {
      queryWhere.product = {
        name: { contains: query.search.trim(), mode: 'insensitive' },
      };
    }

    const inventories = await this.repo.findMany({
      where: queryWhere,
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        product: {
          name: 'asc',
        },
      },
    });

    let filtered = inventories;
    if (query.lowStock === 'true') {
      filtered = inventories.filter((inv) => inv.availableQty <= inv.product.minStockLevel);
    }

    const total = filtered.length;
    const items = filtered.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findLedger(query: { productId?: string; batchId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.productId) where.productId = query.productId;
    if (query.batchId) where.batchId = query.batchId;

    const [items, total] = await Promise.all([
      this.repo.findLedger({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.repo.countLedger(where),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adjustStock(dto: CreateAdjustmentDto) {
    const { batchId, type, quantity, reason, remarks, createdBy } = dto;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch batch
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { product: true },
      });

      if (!batch || batch.deletedAt) {
        throw new NotFoundException(`Batch with ID "${batchId}" not found.`);
      }

      let newAvailableQty = batch.availableQty;
      let newDamagedQty = batch.damagedQty;

      if (type === 'INCREASE') {
        newAvailableQty += quantity;
      } else if (type === 'DECREASE') {
        if (batch.availableQty < quantity) {
          throw new BadRequestException(
            `Cannot decrease stock by ${quantity}. Available quantity is only ${batch.availableQty}.`
          );
        }
        newAvailableQty -= quantity;
        if (reason === 'DAMAGED') {
          newDamagedQty += quantity;
        }
      } else {
        throw new BadRequestException(`Invalid adjustment type: "${type}". Must be INCREASE or DECREASE.`);
      }

      // Determine status
      let status = batch.status;
      if (newAvailableQty === 0) {
        status = 'EXHAUSTED';
      } else if (batch.status === 'EXHAUSTED' && newAvailableQty > 0) {
        status = 'ACTIVE';
      }

      // 2. Update Batch
      const updatedBatch = await tx.batch.update({
        where: { id: batchId },
        data: {
          availableQty: newAvailableQty,
          damagedQty: newDamagedQty,
          status,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      // 3. Create Stock Adjustment Entry
      const adjustment = await tx.stockAdjustment.create({
        data: {
          batchId,
          type,
          quantity,
          reason,
          remarks,
          createdBy,
          syncStatus: SyncStatus.PENDING,
        },
      });

      // 4. Create Ledger Entry
      const ledger = await tx.stockLedger.create({
        data: {
          productId: batch.productId,
          batchId: batch.id,
          transactionType: 'ADJUSTMENT',
          quantity: type === 'INCREASE' ? quantity : -quantity,
          balanceQty: newAvailableQty,
          referenceNumber: `ADJ-${adjustment.id.substring(0, 8).toUpperCase()}`,
          remarks: `Reason: ${reason}. Remarks: ${remarks}`,
          createdBy,
          syncStatus: SyncStatus.PENDING,
        },
      });

      // 5. Update Inventory aggregate table
      const allProductBatches = await tx.batch.findMany({
        where: { productId: batch.productId, deletedAt: null },
      });

      let totalAvailable = 0;
      let totalReserved = 0;
      let totalDamaged = 0;
      let totalExpired = 0;

      const now = new Date();
      allProductBatches.forEach((b: any) => {
        if (b.expiryDate < now) {
          totalExpired += b.availableQty;
        } else {
          totalAvailable += b.availableQty;
        }
        totalReserved += b.reservedQty;
        totalDamaged += b.damagedQty;
      });

      await tx.inventory.upsert({
        where: { productId: batch.productId },
        create: {
          productId: batch.productId,
          availableQty: totalAvailable,
          reservedQty: totalReserved,
          damagedQty: totalDamaged,
          expiredQty: totalExpired,
          syncStatus: SyncStatus.PENDING,
        },
        update: {
          availableQty: totalAvailable,
          reservedQty: totalReserved,
          damagedQty: totalDamaged,
          expiredQty: totalExpired,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      return {
        batch: updatedBatch,
        adjustment,
        ledger,
      };
    });

    if (result) {
      this.eventEmitter.emit(
        'inventory.adjusted',
        new StockAdjustedEvent(batchId, result.batch.productId, type, quantity, reason),
      );
    }

    return result;
  }

  async getAdjustments(query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.repo.findAdjustments({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.repo.countAdjustments(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
