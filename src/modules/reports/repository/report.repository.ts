import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findBillsReport(where: any) {
    return this.prisma.bill.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPurchaseOrdersReport(where: any) {
    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async findBatchesReport(where: any) {
    return this.prisma.batch.findMany({
      where,
      include: { product: true },
    });
  }
}
