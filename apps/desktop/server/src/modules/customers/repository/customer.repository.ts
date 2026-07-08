import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findUnique(args: any) {
    return this.prisma.customer.findUnique(args);
  }

  async findFirst(args: any) {
    return this.prisma.customer.findFirst(args);
  }

  async findMany(args: { where: any; skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.customer.findMany(args);
  }

  async count(args: any) {
    if (args && 'where' in args) {
      return this.prisma.customer.count(args);
    }
    return this.prisma.customer.count({ where: args });
  }

  async create(data: any) {
    return this.prisma.customer.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
    });
  }

  async delete(id: string) {
    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
