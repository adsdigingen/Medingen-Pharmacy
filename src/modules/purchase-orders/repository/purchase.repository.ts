import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PurchaseRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findFirst(args: any) {
    return this.prisma.purchaseOrder.findFirst(args);
  }

  async findMany(args: { where: any; skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.purchaseOrder.findMany({
      ...args,
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async count(args: any) {
    if (args && 'where' in args) {
      return this.prisma.purchaseOrder.count(args);
    }
    return this.prisma.purchaseOrder.count({ where: args });
  }

  async findOne(id: string) {
    return this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
            batch: true,
          },
        },
        returns: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  async create(data: any) {
    return this.prisma.purchaseOrder.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data,
    });
  }

  async getReturns(args: { skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.purchaseReturn.findMany({
      ...args,
      include: {
        supplier: true,
        purchaseOrder: true,
        items: {
          include: {
            product: true,
            batch: true,
          },
        },
      },
    });
  }

  async countReturns() {
    return this.prisma.purchaseReturn.count();
  }
}
