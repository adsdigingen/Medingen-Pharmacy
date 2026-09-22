import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findBatches() {
    return this.prisma.batch.findMany({
      where: { deletedAt: null },
      include: { product: true },
    });
  }

  async findInventories() {
    return this.prisma.inventory.findMany({
      where: { deletedAt: null },
      include: { product: true },
    });
  }

  async countPendingPurchaseOrders() {
    return this.prisma.purchaseOrder.count({
      where: {
        status: { in: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
        deletedAt: null,
      },
    });
  }

  async findReceivedOrders(monthStart: Date) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        status: 'FULLY_RECEIVED',
        updatedAt: { gte: monthStart },
        deletedAt: null,
      },
      include: { items: true },
    });
  }

  async findExpiringBatches(exp90: Date) {
    return this.prisma.batch.findMany({
      where: {
        availableQty: { gt: 0 },
        expiryDate: { lte: exp90 },
        deletedAt: null,
      },
      take: 10,
      orderBy: { expiryDate: 'asc' },
      include: { product: true },
    });
  }

  async findPurchaseOrdersInDateRange(dayDate: Date, nextDay: Date) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        status: 'FULLY_RECEIVED',
        updatedAt: { gte: dayDate, lt: nextDay },
        deletedAt: null,
      },
      include: { items: true },
    });
  }

  async findCategoriesWithProductsAndBatches() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      include: {
        products: {
          include: {
            batches: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
  }
}
