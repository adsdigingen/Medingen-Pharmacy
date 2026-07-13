import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderStatusDto, CreateReturnDto } from './dto/create-po.dto';
import { SyncStatus } from '@medingen/db';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PurchaseOrderCreatedEvent,
  PurchaseOrderReceivedEvent,
  PurchaseReturnCreatedEvent,
} from './events/purchase-order.events';

import { PurchaseRepository } from './repository/purchase.repository';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly repo: PurchaseRepository,
  ) {}

  async create(createPoDto: CreatePurchaseOrderDto) {
    // Generate sequential PO number: PO-YYYYMMDD-XXXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${todayStr}-`;
    
    const lastPo = await this.repo.findFirst({
      where: { poNumber: { startsWith: prefix } },
      orderBy: { poNumber: 'desc' },
    });

    let sequence = 1;
    if (lastPo) {
      const parts = lastPo.poNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
    const poNumber = `${prefix}${sequence.toString().padStart(4, '0')}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Calculate total amount
      let totalAmount = 0;
      createPoDto.items.forEach((item) => {
        totalAmount += item.totalAmount;
      });

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: createPoDto.supplierId,
          purchaseDate: new Date(createPoDto.purchaseDate),
          supplierInvoiceNumber: createPoDto.supplierInvoiceNumber,
          invoiceDate: createPoDto.invoiceDate ? new Date(createPoDto.invoiceDate) : null,
          paymentStatus: createPoDto.paymentStatus,
          paymentMethod: createPoDto.paymentMethod,
          expectedDeliveryDate: createPoDto.expectedDeliveryDate ? new Date(createPoDto.expectedDeliveryDate) : null,
          notes: createPoDto.notes,
          status: createPoDto.status || 'DRAFT',
          syncStatus: SyncStatus.PENDING,
          items: {
            create: createPoDto.items.map((item) => ({
              productId: item.productId,
              batchNumber: item.batchNumber.trim().toUpperCase(),
              manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
              expiryDate: new Date(item.expiryDate),
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              mrp: item.mrp,
              gstPercentage: item.gstPercentage ?? 12,
              discountPercentage: item.discountPercentage ?? 0,
              quantity: item.quantity,
              freeQuantity: item.freeQuantity ?? 0,
              totalAmount: item.totalAmount,
              syncStatus: SyncStatus.PENDING,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
      });

      // If status is immediately set to fully received, handle stock integration
      if (po.status === 'FULLY_RECEIVED') {
        await this.integrateReceivedStock(po.id, tx);
      }

      // Update drug schedules for each item in the product table
      for (const item of createPoDto.items) {
        if (item.drugSchedule !== undefined) {
          await tx.product.update({
            where: { id: item.productId },
            data: { drugSchedule: item.drugSchedule || null },
          });
        }
      }

      return po;
    });

    if (result) {
      this.eventEmitter.emit(
        'purchase-order.created',
        new PurchaseOrderCreatedEvent(
          result.id,
          result.poNumber,
          result.supplierId,
          result.status,
          result.items.length,
        ),
      );
    }

    return result;
  }

  async findAll(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const searchTrim = query.search.trim();
      where.OR = [
        { poNumber: { contains: searchTrim, mode: 'insensitive' } },
        { supplierInvoiceNumber: { contains: searchTrim, mode: 'insensitive' } },
        { supplier: { name: { contains: searchTrim, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.repo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: 'desc' },
      }),
      this.repo.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const po = await this.repo.findOne(id);

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found.`);
    }

    return po;
  }

  async remove(id: string) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only Draft purchase orders can be deleted.');
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        syncStatus: SyncStatus.PENDING,
        updatedAt: new Date(),
      },
    });
  }

  async updateStatus(id: string, dto: UpdatePurchaseOrderStatusDto) {
    const po = await this.findOne(id);

    if (po.status === 'FULLY_RECEIVED' || po.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot change status of a ${po.status} purchase order.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: dto.status,
          supplierInvoiceNumber: dto.supplierInvoiceNumber !== undefined ? dto.supplierInvoiceNumber : po.supplierInvoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : po.invoiceDate,
          paymentStatus: dto.paymentStatus !== undefined ? dto.paymentStatus : po.paymentStatus,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
        include: {
          items: true,
        },
      });

      if (dto.status === 'FULLY_RECEIVED') {
        await this.integrateReceivedStock(id, tx);
      }

      return updatedPo;
    });

    if (result && dto.status === 'FULLY_RECEIVED') {
      this.eventEmitter.emit(
        'purchase-order.received',
        new PurchaseOrderReceivedEvent(result.id, po.poNumber, po.supplierId, result.status),
      );
    }

    return result;
  }

  private async integrateReceivedStock(poId: string, tx: any) {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: true,
        supplier: true,
      },
    });

    // Loop through PO items and create/update Batches and Ledger entries
    for (const item of po.items) {
      const totalQty = item.quantity + item.freeQuantity;

      // 1. Find or create batch
      let batch = await tx.batch.findFirst({
        where: {
          productId: item.productId,
          batchNumber: item.batchNumber,
          deletedAt: null,
        },
      });

      if (batch) {
        batch = await tx.batch.update({
          where: { id: batch.id },
          data: {
            availableQty: batch.availableQty + totalQty,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            mrp: item.mrp,
            gstPercentage: item.gstPercentage,
            status: 'ACTIVE', // Restore state if it was exhausted
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          },
        });
      } else {
        batch = await tx.batch.create({
          data: {
            productId: item.productId,
            batchNumber: item.batchNumber,
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            mrp: item.mrp,
            gstPercentage: item.gstPercentage,
            availableQty: totalQty,
            status: 'ACTIVE',
            syncStatus: SyncStatus.PENDING,
          },
        });
      }

      // Link PO item to batch
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { batchId: batch.id },
      });

      // 2. Write stock ledger
      await tx.stockLedger.create({
        data: {
          productId: item.productId,
          batchId: batch.id,
          transactionType: 'PURCHASE',
          quantity: totalQty,
          balanceQty: batch.availableQty,
          referenceNumber: po.poNumber,
          remarks: `Received from Purchase Order: ${po.poNumber}`,
          createdBy: 'SYSTEM',
          syncStatus: SyncStatus.PENDING,
        },
      });

      // 3. Recalculate Inventory aggregate
      const allProductBatches = await tx.batch.findMany({
        where: { productId: item.productId, deletedAt: null },
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
        where: { productId: item.productId },
        create: {
          productId: item.productId,
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
    }

    // 4. Update Supplier outstanding balance (adding total PO cost)
    let netAmount = 0;
    po.items.forEach((it: any) => {
      netAmount += it.totalAmount;
    });

    if (po.paymentStatus === 'PENDING') {
      await tx.supplier.update({
        where: { id: po.supplierId },
        data: {
          outstandingBalance: po.supplier.outstandingBalance + netAmount,
          syncStatus: SyncStatus.PENDING,
        },
      });
    }
  }

  // --- SUPPLIER RETURNS ---
  async createReturn(dto: CreateReturnDto) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.purchaseOrderId },
      include: { supplier: true },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${dto.purchaseOrderId}" not found.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let returnTotalAmount = 0;

      // 1. Process each returned item
      const returnItemsData = [];
      for (const item of dto.items) {
        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
        });

        if (!batch || batch.deletedAt) {
          throw new NotFoundException(`Batch with ID "${item.batchId}" not found.`);
        }

        if (batch.availableQty < item.quantity) {
          throw new BadRequestException(
            `Cannot return quantity ${item.quantity} for batch "${batch.batchNumber}". Available quantity is only ${batch.availableQty}.`
          );
        }

        const newQty = batch.availableQty - item.quantity;
        const status = newQty === 0 ? 'EXHAUSTED' : batch.status;

        // Update Batch Qty
        await tx.batch.update({
          where: { id: batch.id },
          data: {
            availableQty: newQty,
            status,
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          },
        });

        // Write Ledger Log
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            batchId: batch.id,
            transactionType: 'PURCHASE_RETURN',
            quantity: -item.quantity,
            balanceQty: newQty,
            referenceNumber: dto.creditNoteNumber || po.poNumber,
            remarks: `Returned to supplier. Reason: ${item.reason || 'None provided'}`,
            createdBy: 'SYSTEM',
            syncStatus: SyncStatus.PENDING,
          },
        });

        // Recalculate Inventory aggregate
        const allProductBatches = await tx.batch.findMany({
          where: { productId: item.productId, deletedAt: null },
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
          where: { productId: item.productId },
          create: {
            productId: item.productId,
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

        // Calculate cost value for return invoice (based on purchase price)
        returnTotalAmount += batch.purchasePrice * item.quantity;
        
        returnItemsData.push({
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          reason: item.reason,
          syncStatus: SyncStatus.PENDING,
        });
      }

      // 2. Create Supplier Return Invoice record
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          purchaseOrderId: dto.purchaseOrderId,
          supplierId: dto.supplierId,
          creditNoteNumber: dto.creditNoteNumber,
          returnDate: new Date(dto.returnDate),
          remarks: dto.remarks,
          syncStatus: SyncStatus.PENDING,
          items: {
            create: returnItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // 3. Deduct supplier outstanding balances
      const supplier = await tx.supplier.findUnique({
        where: { id: dto.supplierId },
      });

      if (supplier) {
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: {
            outstandingBalance: Math.max(0, supplier.outstandingBalance - returnTotalAmount),
            syncStatus: SyncStatus.PENDING,
          },
        });
      }

      return purchaseReturn;
    });

    if (result) {
      this.eventEmitter.emit(
        'purchase-return.created',
        new PurchaseReturnCreatedEvent(
          result.id,
          dto.purchaseOrderId,
          po.poNumber,
          dto.supplierId,
          dto.items.length,
        ),
      );
    }

    return result;
  }

  async getReturns(query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.repo.getReturns({
        skip,
        take: limit,
        orderBy: { returnDate: 'desc' },
      }),
      this.repo.countReturns(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, dto: CreatePurchaseOrderDto) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only Draft purchase orders can be updated.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      // 2. Calculate total amount
      let totalAmount = 0;
      dto.items.forEach((item) => {
        totalAmount += item.totalAmount;
      });

      // 3. Update PO and recreate items
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          purchaseDate: new Date(dto.purchaseDate),
          supplierInvoiceNumber: dto.supplierInvoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
          paymentStatus: dto.paymentStatus,
          paymentMethod: dto.paymentMethod,
          expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
          notes: dto.notes,
          status: dto.status || 'DRAFT',
          syncStatus: SyncStatus.PENDING,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              batchNumber: item.batchNumber.trim().toUpperCase(),
              manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
              expiryDate: new Date(item.expiryDate),
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              mrp: item.mrp,
              gstPercentage: item.gstPercentage ?? 12,
              discountPercentage: item.discountPercentage ?? 0,
              quantity: item.quantity,
              freeQuantity: item.freeQuantity ?? 0,
              totalAmount: item.totalAmount,
              syncStatus: SyncStatus.PENDING,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update drug schedules for each item in the product table
      for (const item of dto.items) {
        if (item.drugSchedule !== undefined) {
          await tx.product.update({
            where: { id: item.productId },
            data: { drugSchedule: item.drugSchedule || null },
          });
        }
      }

      return updated;
    });

    return result;
  }
}
