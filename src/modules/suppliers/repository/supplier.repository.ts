import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupplierRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findFirst(args: any) {
    return this.prisma.supplier.findFirst(args);
  }

  async findMany(args: { where: any; skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.supplier.findMany(args);
  }

  async count(args: any) {
    if (args && 'where' in args) {
      return this.prisma.supplier.count(args);
    }
    return this.prisma.supplier.count({ where: args });
  }

  async create(data: any) {
    return this.prisma.supplier.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async deleteMany(where?: any) {
    return this.prisma.supplier.deleteMany({ where });
  }

  async createMany(data: any[]) {
    return this.prisma.supplier.createMany({ data });
  }
}
