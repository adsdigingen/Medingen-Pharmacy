import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findSingleton() {
    return this.prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });
  }

  async createSingleton(data: any) {
    return this.prisma.systemSettings.create({ data });
  }

  async updateSingleton(data: any) {
    return this.prisma.systemSettings.update({
      where: { id: 'singleton' },
      data,
    });
  }

  async findMany() {
    return this.prisma.systemSettings.findMany();
  }

  async updateMany(data: any) {
    return this.prisma.systemSettings.updateMany({ data });
  }
}
