import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BatchRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string) {
    return this.prisma.batch.findFirst({
      where: { id, deletedAt: null },
      include: { product: true },
    });
  }

  async findFirst(args: any) {
    return this.prisma.batch.findFirst(args);
  }

  async findMany(args: { where: any; skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.batch.findMany({
      ...args,
      include: { product: true },
    });
  }

  async count(args: any) {
    if (args && 'where' in args) {
      return this.prisma.batch.count(args);
    }
    return this.prisma.batch.count({ where: args });
  }

  async create(data: any) {
    return this.prisma.batch.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.batch.update({
      where: { id },
      data,
      include: { product: true },
    });
  }

  async deleteMany(where?: any) {
    return this.prisma.batch.deleteMany({ where });
  }

  async createMany(data: any[]) {
    return this.prisma.batch.createMany({ data });
  }
}
