import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findMany(args: { where: any; skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.auditLog.findMany(args);
  }

  async count(args: any) {
    if (args && 'where' in args) {
      return this.prisma.auditLog.count(args);
    }
    return this.prisma.auditLog.count({ where: args });
  }

  async create(data: any) {
    return this.prisma.auditLog.create({ data });
  }
}
