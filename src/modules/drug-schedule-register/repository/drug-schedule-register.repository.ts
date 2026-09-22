import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DrugScheduleRegisterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(args: {
    where?: any;
    select?: any;
    include?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.drugScheduleRegister.findMany(args);
  }

  async findUnique(args: {
    where: { id: string };
    include?: any;
  }) {
    return this.prisma.drugScheduleRegister.findUnique(args);
  }

  async findFirst(args: {
    where?: any;
    include?: any;
    orderBy?: any;
  }) {
    return this.prisma.drugScheduleRegister.findFirst(args);
  }

  async count(args: { where?: any }) {
    return this.prisma.drugScheduleRegister.count(args);
  }

  async create(args: { data: any; include?: any }) {
    return this.prisma.drugScheduleRegister.create(args);
  }

  async update(args: { where: { id: string }; data: any; include?: any }) {
    return this.prisma.drugScheduleRegister.update(args);
  }
}
