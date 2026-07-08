import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class BillingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getLatestInvoiceNumber(prefix: string) {
    return this.prisma.bill.findFirst({
      where: { billNumber: { startsWith: prefix } },
      orderBy: { billNumber: 'desc' },
    });
  }

  async findCustomerByMobile(mobile: string) {
    return this.prisma.customer.findUnique({
      where: { mobile },
    });
  }

  async createCustomer(name: string, mobile: string) {
    return this.prisma.customer.create({
      data: {
        name,
        mobile,
        syncStatus: SyncStatus.PENDING,
      },
    });
  }

  async getActiveBatchesForProduct(productId: string, now: Date) {
    return this.prisma.batch.findMany({
      where: {
        productId,
        availableQty: { gt: 0 },
        expiryDate: { gt: now },
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getProductById(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
    });
  }

  async getHoldBill(holdBillId: string) {
    return this.prisma.holdBill.findUnique({
      where: { id: holdBillId },
    });
  }

  async getHoldBills() {
    return this.prisma.holdBill.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async createHoldBill(data: any) {
    return this.prisma.holdBill.create({
      data,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async deleteHoldBill(id: string) {
    return this.prisma.holdBill.delete({
      where: { id },
    });
  }

  async findUniqueBill(id: string) {
    return this.prisma.bill.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: true,
        billItems: {
          include: {
            batch: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async findManyBills(args: { where: any; skip?: number; take?: number; orderBy?: any }) {
    return this.prisma.bill.findMany({
      ...args,
      include: {
        customer: true,
        payments: true,
        billItems: {
          include: {
            batch: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async countBills(where: any) {
    return this.prisma.bill.count({ where });
  }
}
