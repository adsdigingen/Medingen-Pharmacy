import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findMany(args: { where: any; include?: any; orderBy?: any }): Promise<any[]> {
    return this.prisma.inventory.findMany(args);
  }

  async findLedger(args: { where: any; skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.stockLedger.findMany({
      ...args,
      include: {
        product: true,
        batch: true,
      },
    });
  }

  async countLedger(args: any) {
    if (args && 'where' in args) {
      return this.prisma.stockLedger.count(args);
    }
    return this.prisma.stockLedger.count({ where: args });
  }

  async countAdjustments() {
    return this.prisma.stockAdjustment.count();
  }

  async findAdjustments(args: { skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.stockAdjustment.findMany({
      ...args,
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async upsertInventory(productId: string, data: any) {
    return this.prisma.inventory.upsert({
      where: { productId },
      create: { productId, ...data },
      update: data,
    });
  }
}
