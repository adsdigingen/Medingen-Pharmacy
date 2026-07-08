import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { SyncStatus } from '@medingen/db';
import { BatchRepository } from './repository/batch.repository';

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: BatchRepository,
  ) {}

  async findAll(query: { productId?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { batchNumber: { contains: query.search.trim(), mode: 'insensitive' } },
        { product: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.repo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expiryDate: 'asc' }, // FEFO sorting by default
      }),
      this.repo.count({ where }),
    ]);

    // Check expiry dates dynamically on items and update status to EXPIRED if date is passed
    const now = new Date();
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        if (item.expiryDate < now && item.status !== 'EXPIRED' && item.status !== 'EXHAUSTED') {
          // Update status in background to keep database synced
          const updated = await this.repo.update(item.id, {
            status: 'EXPIRED',
            syncStatus: SyncStatus.PENDING,
            updatedAt: now,
          });
          return updated;
        }
        return item;
      })
    );

    return {
      items: updatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const batch = await this.repo.findById(id);

    if (!batch) {
      throw new NotFoundException(`Batch with ID "${id}" not found.`);
    }

    return batch;
  }

  async update(id: string, updateBatchDto: UpdateBatchDto) {
    const batch = await this.findOne(id);

    return this.repo.update(id, {
      purchasePrice: updateBatchDto.purchasePrice !== undefined ? updateBatchDto.purchasePrice : batch.purchasePrice,
      sellingPrice: updateBatchDto.sellingPrice !== undefined ? updateBatchDto.sellingPrice : batch.sellingPrice,
      mrp: updateBatchDto.mrp !== undefined ? updateBatchDto.mrp : batch.mrp,
      status: updateBatchDto.status !== undefined ? updateBatchDto.status : batch.status,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });
  }

  // Find batches by product for FEFO (First Expire First Out)
  async findFefoBatches(productId: string) {
    return this.repo.findMany({
      where: {
        productId,
        status: 'ACTIVE',
        availableQty: { gt: 0 },
        deletedAt: null,
      },
      orderBy: { expiryDate: 'asc' }, // First Expiring batches first
    });
  }
}
