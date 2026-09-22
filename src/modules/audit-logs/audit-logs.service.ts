import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditRepository } from './repository/audit.repository';

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AuditRepository,
  ) {}

  async log(userId: string | null, username: string | null, module: string, action: string, device: string | null, details: string | null) {
    return this.repo.create({
      userId,
      username,
      module,
      action,
      device: device || 'LOCAL_DESKTOP',
      details,
    });
  }

  async findAll(query: { search?: string; module?: string; action?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 15);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.module) {
      where.module = query.module;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.search) {
      const searchTrim = query.search.trim();
      where.OR = [
        { username: { contains: searchTrim, mode: 'insensitive' } },
        { details: { contains: searchTrim, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.repo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.repo.count(where),
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
