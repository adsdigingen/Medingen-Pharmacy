import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardRepository } from './repository/dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: DashboardRepository,
  ) {}

  async getStats() {
    const now = new Date();
    
    // Date ranges
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const exp30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const exp60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const exp90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1. Fetch batches for value calculations
    const batches = await this.repo.findBatches();

    let totalInventoryValue = 0;
    let totalStockQty = 0;
    let expiredCount = 0;
    let expiring30Count = 0;
    let expiring60Count = 0;
    let expiring90Count = 0;

    batches.forEach((b: any) => {
      totalInventoryValue += b.availableQty * b.purchasePrice;
      totalStockQty += b.availableQty;

      if (b.expiryDate < now) {
        if (b.availableQty > 0) expiredCount++;
      } else if (b.expiryDate <= exp30) {
        if (b.availableQty > 0) expiring30Count++;
      } else if (b.expiryDate <= exp60) {
        if (b.availableQty > 0) expiring60Count++;
      } else if (b.expiryDate <= exp90) {
        if (b.availableQty > 0) expiring90Count++;
      }
    });

    // 2. Fetch inventories for low stock calculation
    const inventories = await this.repo.findInventories();

    const lowStockCount = inventories.filter((inv) => inv.availableQty <= inv.product.minStockLevel).length;

    // 3. Pending Purchase Orders count
    const pendingPoCount = await this.repo.countPendingPurchaseOrders();

    // 4. Purchases values (Today & Month)
    const receivedOrders = await this.repo.findReceivedOrders(monthStart);

    let purchasesToday = 0;
    let purchasesThisMonth = 0;

    receivedOrders.forEach((po) => {
      let poCost = 0;
      po.items.forEach((it) => {
        poCost += it.totalAmount;
      });

      if (po.updatedAt >= todayStart) {
        purchasesToday += poCost;
      }
      purchasesThisMonth += poCost;
    });

    // 5. Expiry List (top 10 closest to expiring)
    const expiringBatches = await this.repo.findExpiringBatches(exp90);

    // 6. Low stock products (top 10 lowest relative to minimum level)
    const lowStockInventories = await this.repo.findInventories();
    
    const lowStockList = lowStockInventories
      .filter((inv) => inv.availableQty <= inv.product.minStockLevel)
      .slice(0, 10)
      .map((inv) => ({
        id: inv.id,
        productName: inv.product.name,
        availableQty: inv.availableQty,
        minStockLevel: inv.product.minStockLevel,
      }));

    // 7. Purchase trends (Last 7 days data)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const trendData = await Promise.all(
      last7Days.map(async (dayDate) => {
        const nextDay = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);
        const dayOrders = await this.repo.findPurchaseOrdersInDateRange(dayDate, nextDay);

        let totalVal = 0;
        dayOrders.forEach((o: any) => {
          o.items.forEach((it: any) => {
            totalVal += it.totalAmount;
          });
        });

        return {
          date: dayDate.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' }),
          amount: totalVal,
        };
      })
    );

    // 8. Category Distribution
    const categories = await this.repo.findCategoriesWithProductsAndBatches();

    const categoryDistribution = categories
      .map((cat) => {
        let value = 0;
        cat.products.forEach((prod: any) => {
          prod.batches.forEach((b: any) => {
            value += b.availableQty * b.purchasePrice;
          });
        });
        return {
          name: cat.name,
          value,
        };
      })
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      stats: {
        totalInventoryValue,
        totalStockQty,
        lowStockCount,
        expiredCount,
        expiring30Count,
        expiring60Count,
        expiring90Count,
        pendingPoCount,
        purchasesToday,
        purchasesThisMonth,
      },
      expiringBatches,
      lowStockList,
      trendData,
      categoryDistribution,
    };
  }
}
