import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class ProductRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        manufacturer: true,
        supplier: true,
      },
    });
  }

  async findFirst(args: any) {
    return this.prisma.product.findFirst(args);
  }

  async create(data: any) {
    return this.prisma.product.create({
      data,
      include: {
        category: true,
        manufacturer: true,
        supplier: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        manufacturer: true,
        supplier: true,
      },
    });
  }

  async count(args: any) {
    if (args && 'where' in args) {
      return this.prisma.product.count(args);
    }
    return this.prisma.product.count({ where: args });
  }

  async findMany(args: { where: any; skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.product.findMany({
      ...args,
      include: {
        category: true,
        manufacturer: true,
        supplier: true,
      },
    });
  }
}
