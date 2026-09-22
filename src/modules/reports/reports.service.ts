import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportRepository } from './repository/report.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ReportRepository,
  ) {}

  async getSalesReport(query: { startDate?: string; endDate?: string; paymentMethod?: string }) {
    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const where: any = {
      createdAt: { gte: start, lte: end },
      status: 'COMPLETED',
      deletedAt: null,
    };

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    const bills = await this.repo.findBillsReport(where);

    let totalRevenue = 0;
    let totalGst = 0;
    let totalDiscount = 0;
    let totalProfit = 0;
    
    const paymentBreakdown: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, MIXED: 0, CREDIT: 0 };

    bills.forEach((b) => {
      totalRevenue += b.netAmount;
      totalGst += b.gstAmount;
      totalDiscount += b.discountAmount;
      totalProfit += b.profitAmount;

      if (paymentBreakdown[b.paymentMethod] !== undefined) {
        paymentBreakdown[b.paymentMethod] += b.netAmount;
      }
    });

    return {
      filters: { start, end },
      summary: {
        totalBills: bills.length,
        revenue: totalRevenue,
        gst: totalGst,
        discount: totalDiscount,
        profit: totalProfit,
      },
      paymentBreakdown,
      items: bills.map(b => ({
        id: b.id,
        billNumber: b.billNumber,
        customerName: b.customer?.name || 'Walk-in',
        netAmount: b.netAmount,
        paymentMethod: b.paymentMethod,
        createdAt: b.createdAt,
      })),
    };
  }

  async getPurchaseReport(query: { supplierId?: string; startDate?: string; endDate?: string }) {
    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const where: any = {
      purchaseDate: { gte: start, lte: end },
      deletedAt: null,
    };

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    const pos = await this.repo.findPurchaseOrdersReport(where);

    let totalCost = 0;
    pos.forEach((po) => {
      let poCost = 0;
      po.items.forEach(it => poCost += it.totalAmount);
      totalCost += poCost;
    });

    return {
      filters: { start, end },
      totalPurchaseOrders: pos.length,
      totalCost,
      items: pos.map(po => {
        let amount = 0;
        po.items.forEach(it => amount += it.totalAmount);
        return {
          id: po.id,
          poNumber: po.poNumber,
          supplierName: po.supplier.name,
          purchaseDate: po.purchaseDate,
          status: po.status,
          amount,
        };
      }),
    };
  }

  async getInventoryReport() {
    const batches = await this.repo.findBatchesReport({ deletedAt: null });

    let totalStockValue = 0;
    let activeItemsCount = 0;
    let deadStockCount = 0;

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    batches.forEach((b) => {
      totalStockValue += b.availableQty * b.purchasePrice;
      if (b.availableQty > 0) activeItemsCount++;
      
      // Dead Stock validation: no sales logged in last 90 days
      if (b.availableQty > 0 && b.createdAt < threeMonthsAgo) {
        deadStockCount++;
      }
    });

    return {
      summary: {
        totalStockValue,
        activeBatches: activeItemsCount,
        deadStockBatches: deadStockCount,
      },
    };
  }

  async getGstReport(query: { startDate?: string; endDate?: string }) {
    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    // Taxable Sales totals
    const bills = await this.repo.findBillsReport({
      createdAt: { gte: start, lte: end },
      status: 'COMPLETED',
      deletedAt: null,
    });

    let taxableSales = 0;
    let outputGst = 0;

    bills.forEach((b) => {
      outputGst += b.gstAmount;
      taxableSales += b.netAmount - b.gstAmount;
    });

    // Taxable Purchases totals
    const pos = await this.repo.findPurchaseOrdersReport({
      purchaseDate: { gte: start, lte: end },
      status: 'FULLY_RECEIVED',
      deletedAt: null,
    });

    let taxablePurchases = 0;
    let inputGst = 0;

    pos.forEach((po) => {
      po.items.forEach((item) => {
        const gst = item.totalAmount * (item.gstPercentage / (100 + item.gstPercentage));
        inputGst += gst;
        taxablePurchases += item.totalAmount - gst;
      });
    });

    return {
      taxPeriod: { start, end },
      sales: {
        taxableSales,
        outputGst,
        cgst: outputGst / 2,
        sgst: outputGst / 2,
      },
      purchases: {
        taxablePurchases,
        inputGst,
        cgst: inputGst / 2,
        sgst: inputGst / 2,
      },
    };
  }
}
