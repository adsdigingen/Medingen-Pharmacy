import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { CheckoutCounterDto } from './dto/checkout-counter.dto';
import { AdjustCounterDto } from './dto/adjust-counter.dto';
import { SyncStatus } from '@medingen/db';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CounterService {
  constructor(private readonly prisma: PrismaService) {}

  async transferToCounter(dto: TransferStockDto, username: string) {
    const { productId, batchId, transferStrips, unitsPerStrip, sellingPrice } = dto;

    if (transferStrips <= 0) {
      throw new BadRequestException('Transfer strips quantity must be greater than zero.');
    }
    if (unitsPerStrip <= 0) {
      throw new BadRequestException('Units per strip must be greater than zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch batch
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { product: true },
      });

      if (!batch || batch.deletedAt) {
        throw new NotFoundException(`Batch with ID "${batchId}" not found.`);
      }

      if (batch.availableQty < transferStrips) {
        throw new BadRequestException(
          `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQty} strips, Requested: ${transferStrips} strips.`
        );
      }

      const newAvailableQty = batch.availableQty - transferStrips;
      const status = newAvailableQty === 0 ? 'EXHAUSTED' : batch.status;

      // 2. Reduce strips from batch
      const updatedBatch = await tx.batch.update({
        where: { id: batchId },
        data: {
          availableQty: newAvailableQty,
          status,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      // 3. Create or update CounterInventory
      const transferredUnits = transferStrips * unitsPerStrip;
      
      const counterInv = await tx.counterInventory.upsert({
        where: {
          productId_batchId: { productId, batchId },
        },
        create: {
          productId,
          batchId,
          unitsPerStrip,
          availableUnits: transferredUnits,
          minimumUnits: 20, // default minimumUnits alert level
          sellingPrice: sellingPrice !== undefined ? sellingPrice : null,
          syncStatus: SyncStatus.PENDING,
        },
        update: {
          availableUnits: { increment: transferredUnits },
          unitsPerStrip,
          sellingPrice: sellingPrice !== undefined ? sellingPrice : undefined,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      // 4. Create CounterTransfer record
      const transfer = await tx.counterTransfer.create({
        data: {
          productId,
          batchId,
          transferStrips,
          unitsPerStrip,
          transferredUnits,
          sellingPrice: sellingPrice !== undefined ? sellingPrice : null,
          createdBy: username || 'SYSTEM',
          syncStatus: SyncStatus.PENDING,
        },
      });

      // 5. Create StockLedger transaction
      const referenceNumber = `TRF-${transfer.id.substring(0, 8).toUpperCase()}`;
      await tx.stockLedger.create({
        data: {
          productId,
          batchId,
          transactionType: 'COUNTER_TRANSFER',
          quantity: -transferStrips, // negative main stock adjustment
          balanceQty: newAvailableQty,
          referenceNumber,
          remarks: `Transferred ${transferStrips} strips to counter inventory (${transferredUnits} units)`,
          createdBy: username || 'SYSTEM',
          syncStatus: SyncStatus.PENDING,
        },
      });

      // 6. Update main inventory aggregate
      const allProductBatches = await tx.batch.findMany({
        where: { productId, deletedAt: null },
      });

      let totalAvailable = 0;
      let totalReserved = 0;
      let totalDamaged = 0;
      let totalExpired = 0;

      const now = new Date();
      allProductBatches.forEach((b: any) => {
        if (b.expiryDate < now) {
          totalExpired += b.availableQty;
        } else {
          totalAvailable += b.availableQty;
        }
        totalReserved += b.reservedQty;
        totalDamaged += b.damagedQty;
      });

      await tx.inventory.upsert({
        where: { productId },
        create: {
          productId,
          availableQty: totalAvailable,
          reservedQty: totalReserved,
          damagedQty: totalDamaged,
          expiredQty: totalExpired,
          syncStatus: SyncStatus.PENDING,
        },
        update: {
          availableQty: totalAvailable,
          reservedQty: totalReserved,
          damagedQty: totalDamaged,
          expiredQty: totalExpired,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      return {
        batch: updatedBatch,
        counterInventory: counterInv,
        transfer,
      };
    });
  }

  async getCounterProducts(query: { search?: string; lowStock?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 25);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        {
          product: {
            name: { contains: query.search.trim(), mode: 'insensitive' },
          },
        },
        {
          product: {
            genericName: { contains: query.search.trim(), mode: 'insensitive' },
          },
        },
        {
          batch: {
            batchNumber: { contains: query.search.trim(), mode: 'insensitive' },
          },
        },
      ];
    }

    if (query.lowStock === 'true') {
      where.availableUnits = {
        lte: this.prisma.counterInventory.fields.minimumUnits, // Wait, prisma field lte minimumUnits directly requires a value. Let's do filtering post-fetch or raw, or standard prisma. Let's do it post-fetch or filter lte value if minimumUnits is queryable
      };
    }

    // Since availableUnits <= minimumUnits filter is row-specific, let's fetch matching first
    let rawItems = await this.prisma.counterInventory.findMany({
      where,
      include: {
        product: true,
        batch: true,
      },
      orderBy: {
        product: { name: 'asc' },
      },
    });

    if (query.lowStock === 'true') {
      rawItems = rawItems.filter((it) => it.availableUnits <= it.minimumUnits);
    }

    const total = rawItems.length;
    const items = rawItems.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adjustCounterStock(dto: AdjustCounterDto, username: string) {
    const { productId, batchId, type, quantity, reason, remarks } = dto;

    if (quantity <= 0) {
      throw new BadRequestException('Adjustment quantity must be greater than zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.counterInventory.findUnique({
        where: {
          productId_batchId: { productId, batchId },
        },
      });

      if (!inv) {
        throw new NotFoundException('Counter Inventory record not found.');
      }

      let newAvailable = inv.availableUnits;
      if (type === 'INCREASE') {
        newAvailable += quantity;
      } else {
        if (inv.availableUnits < quantity) {
          throw new BadRequestException(`Cannot decrease stock by ${quantity} units. Available: ${inv.availableUnits}`);
        }
        newAvailable -= quantity;
      }

      const updatedInv = await tx.counterInventory.update({
        where: {
          productId_batchId: { productId, batchId },
        },
        data: {
          availableUnits: newAvailable,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      // Create Stock Ledger Entry
      const referenceNumber = `CADJ-${uuidv4().substring(0, 8).toUpperCase()}`;
      await tx.stockLedger.create({
        data: {
          productId,
          batchId,
          transactionType: 'COUNTER_ADJUSTMENT',
          quantity: type === 'INCREASE' ? quantity : -quantity,
          balanceQty: newAvailable,
          referenceNumber,
          remarks: `Counter adjustment. Reason: ${reason}. Remarks: ${remarks || ''}`,
          createdBy: username || 'SYSTEM',
          syncStatus: SyncStatus.PENDING,
        },
      });

      return updatedInv;
    });
  }

  async checkoutCounter(dto: CheckoutCounterDto, cashierId: string, cashierName: string) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Cannot checkout an empty sales basket.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate unique CS invoice number
      let invoiceNumber = '';
      let exists = true;
      let retries = 0;
      while (exists && retries < 20) {
        const randNum = Math.floor(10000 + Math.random() * 90000).toString();
        const randInvoice = `CS-${randNum}`;
        const existing = await tx.counterSale.findUnique({
          where: { invoiceNumber: randInvoice },
        });
        if (!existing) {
          invoiceNumber = randInvoice;
          exists = false;
        }
        retries++;
      }
      if (!invoiceNumber) {
        invoiceNumber = `CS-${Math.floor(10000 + Math.random() * 90000)}`;
      }

      const createdItems = [];

      // 2. Validate and deduct stock
      for (const item of dto.items) {
        const inv = await tx.counterInventory.findUnique({
          where: {
            productId_batchId: { productId: item.productId, batchId: item.batchId },
          },
          include: { product: true },
        });

        if (!inv) {
          throw new NotFoundException(`Medicine inventory for product ID "${item.productId}" not found at the counter.`);
        }

        if (inv.availableUnits < item.quantity) {
          throw new BadRequestException(
            `Insufficient counter stock for "${inv.product.name}". Available: ${inv.availableUnits} units, Requested: ${item.quantity} units.`
          );
        }

        const newUnits = inv.availableUnits - item.quantity;

        // Deduct
        await tx.counterInventory.update({
          where: {
            productId_batchId: { productId: item.productId, batchId: item.batchId },
          },
          data: {
            availableUnits: newUnits,
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          },
        });

        // Create CounterSaleItem template data
        createdItems.push({
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          discount: item.discount ?? 0,
          gst: item.gst ?? 0,
          total: item.total,
          syncStatus: SyncStatus.PENDING,
        });

        // Stock Ledger entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            batchId: item.batchId,
            transactionType: 'COUNTER_SALE',
            quantity: -item.quantity,
            balanceQty: newUnits,
            referenceNumber: invoiceNumber,
            remarks: `Counter Sales Checkout`,
            createdBy: cashierName || 'CASHIER',
            syncStatus: SyncStatus.PENDING,
          },
        });
      }

      // 3. Create CounterSale
      const sale = await tx.counterSale.create({
        data: {
          invoiceNumber,
          paymentMethod: dto.paymentMethod,
          grandTotal: dto.grandTotal,
          cashierId,
          syncStatus: SyncStatus.PENDING,
          items: {
            create: createdItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
              batch: true,
            },
          },
        },
      });

      return sale;
    });
  }

  async getCounterSales(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.invoiceNumber = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.counterSale.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: true,
              batch: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.counterSale.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCounterHistory(productId: string, batchId: string) {
    // Return ledger logs for this product/batch from StockLedger
    return this.prisma.stockLedger.findMany({
      where: {
        productId,
        batchId,
        transactionType: {
          in: ['COUNTER_TRANSFER', 'COUNTER_SALE', 'COUNTER_ADJUSTMENT', 'COUNTER_RETURN'],
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // Reports implementations
  async getTransferReport(query: { startDate?: string; endDate?: string }) {
    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const items = await this.prisma.counterTransfer.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      include: {
        product: true,
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalTransfers = items.length;
    const totalStrips = items.reduce((sum, it) => sum + it.transferStrips, 0);
    const totalUnits = items.reduce((sum, it) => sum + it.transferredUnits, 0);

    return {
      filters: { start, end },
      summary: { totalTransfers, totalStrips, totalUnits },
      items,
    };
  }

  async getSalesReport(query: { startDate?: string; endDate?: string }) {
    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const sales = await this.prisma.counterSale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: true,
            batch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalSales = sales.length;
    const totalCollection = sales.reduce((sum, s) => sum + s.grandTotal, 0);

    return {
      filters: { start, end },
      summary: { totalSales, totalCollection },
      items: sales,
    };
  }

  async getDailyCollectionReport(query: { date?: string }) {
    const dateStr = query.date || new Date().toISOString().slice(0, 10);
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    const sales = await this.prisma.counterSale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });

    const paymentBreakdown: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0 };
    let totalCollection = 0;

    sales.forEach((s) => {
      totalCollection += s.grandTotal;
      if (paymentBreakdown[s.paymentMethod] !== undefined) {
        paymentBreakdown[s.paymentMethod] += s.grandTotal;
      } else {
        paymentBreakdown[s.paymentMethod] = s.grandTotal;
      }
    });

    return {
      date: dateStr,
      summary: { totalCollection, totalSales: sales.length },
      paymentBreakdown,
    };
  }

  async getStockReport() {
    const items = await this.prisma.counterInventory.findMany({
      include: {
        product: true,
        batch: true,
      },
      orderBy: { product: { name: 'asc' } },
    });

    let totalStockValue = 0;
    items.forEach((it) => {
      // Batch purchase price is per strip. Convert to per individual unit cost.
      const costPerUnit = it.batch.purchasePrice / it.unitsPerStrip;
      totalStockValue += it.availableUnits * costPerUnit;
    });

    return {
      summary: {
        totalStockValue,
        totalItemsCount: items.length,
      },
      items,
    };
  }

  async getLowStockReport() {
    const items = await this.prisma.counterInventory.findMany({
      include: {
        product: true,
        batch: true,
      },
      orderBy: { product: { name: 'asc' } },
    });

    const lowStockItems = items.filter((it) => it.availableUnits <= it.minimumUnits);

    return {
      summary: {
        lowStockItemsCount: lowStockItems.length,
      },
      items: lowStockItems,
    };
  }

  async getProfitReport(query: { startDate?: string; endDate?: string }) {
    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const sales = await this.prisma.counterSale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            batch: true,
            product: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const productMargins: Record<string, { quantity: number; revenue: number; profit: number }> = {};

    // Pre-fetch all counter inventories to know unitsPerStrip in memory
    const counterInvs = await this.prisma.counterInventory.findMany();
    const unitsPerStripMap = new Map<string, number>();
    counterInvs.forEach((ci) => {
      unitsPerStripMap.set(`${ci.productId}_${ci.batchId}`, ci.unitsPerStrip);
    });

    sales.forEach((sale) => {
      totalRevenue += sale.grandTotal;
      sale.items.forEach((item) => {
        // Find units per strip from standard mapping or inventory config
        const unitsPerStrip = unitsPerStripMap.get(`${item.productId}_${item.batchId}`) || 10; // Fallback to 10
        const costPerUnit = (item.batch?.purchasePrice || 0) / unitsPerStrip;
        
        const itemCost = item.quantity * costPerUnit;
        const itemProfit = item.total - itemCost;
        
        totalCost += itemCost;
        totalProfit += itemProfit;

        const prodName = item.product.name;
        if (!productMargins[prodName]) {
          productMargins[prodName] = { quantity: 0, revenue: 0, profit: 0 };
        }
        productMargins[prodName].quantity += item.quantity;
        productMargins[prodName].revenue += item.total;
        productMargins[prodName].profit += itemProfit;
      });
    });

    return {
      filters: { start, end },
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        netMarginPercentage: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      },
      productMargins: Object.entries(productMargins).map(([name, data]) => ({
        productName: name,
        ...data,
      })),
    };
  }

  async printReceiptText(saleId: string, widthType: '58mm' | '80mm' | '150x95mm' = '80mm') {
    const [sale, settings] = await Promise.all([
      this.prisma.counterSale.findUnique({
        where: { id: saleId },
        include: {
          items: {
            include: {
              product: true,
              batch: true,
            },
          },
        },
      }),
      this.prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
      }),
    ]);

    if (!sale) {
      throw new NotFoundException(`Counter Sale with ID "${saleId}" not found.`);
    }

    const width = widthType === '58mm' ? 32 : (widthType === '80mm' ? 48 : 88);
    const lines: string[] = [];

    const center = (text: string) => {
      const pad = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(pad) + text;
    };

    const separator = () => '-'.repeat(width);
    const doubleSeparator = () => '='.repeat(width);

    const padLeftRight = (left: string, right: string) => {
      const spacing = width - left.length - right.length;
      if (spacing <= 0) return left.substring(0, width - right.length - 1) + ' ' + right;
      return left + ' '.repeat(spacing) + right;
    };

    // Header
    lines.push(center(settings?.storeName?.toUpperCase() || "MEDINGEN PHARMACY"));
    if (settings?.address) lines.push(center(settings.address));
    if (settings?.phone) lines.push(center(`Ph: ${settings.phone}`));
    lines.push(center("COUNTER SALE RECEIPT"));
    lines.push(separator());

    // Metadata
    lines.push(`Invoice #: ${sale.invoiceNumber}`);
    lines.push(`Date: ${new Date(sale.createdAt).toLocaleString()}`);
    lines.push(`Cashier: ADMIN`);
    lines.push(`Payment: ${sale.paymentMethod}`);
    lines.push(separator());

    // Columns & Items
    if (widthType === '58mm') {
      lines.push("Item Description");
      lines.push(padLeftRight("  Qty x Price", "Amount"));
      lines.push(separator());
      sale.items.forEach((item) => {
        lines.push(item.product.name.substring(0, width));
        const details = `  ${item.quantity} units x ₹${item.sellingPrice.toFixed(2)}`;
        lines.push(padLeftRight(details, `₹${item.total.toFixed(2)}`));
      });
    } else if (widthType === '80mm') {
      lines.push(padLeftRight("Item Name (Batch)", "Qty x Price      Amount"));
      lines.push(separator());
      sale.items.forEach((item) => {
        const name = `${item.product.name} (${item.batch.batchNumber})`;
        const details = `${item.quantity.toString().padStart(3)} x ₹${item.sellingPrice.toFixed(2).padEnd(6)}  ₹${item.total.toFixed(2).padStart(7)}`;
        lines.push(padLeftRight(name.substring(0, 20), details));
      });
    } else {
      lines.push(padLeftRight("Item Name (Batch)", `Qty ${"Rate".padStart(12)} ${"Amount".padStart(14)}`));
      lines.push(separator());
      sale.items.forEach((item) => {
        const name = `${item.product.name} (${item.batch.batchNumber})`;
        const rightSide = `${item.quantity.toString().padStart(4)} ${`₹${item.sellingPrice.toFixed(2)}`.padStart(12)} ${`₹${item.total.toFixed(2)}`.padStart(14)}`;
        lines.push(padLeftRight(name.substring(0, 36), rightSide));
      });
    }

    lines.push(separator());
    lines.push(padLeftRight("GRAND TOTAL:", `₹${sale.grandTotal.toFixed(2)}`));
    lines.push(doubleSeparator());
    lines.push(center("***Wish You A Speedy Recovery***"));

    return { text: lines.join('\n') };
  }
}
