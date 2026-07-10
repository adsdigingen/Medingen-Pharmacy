import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutBillDto, HoldBillDto, SalesReturnDto } from './dto/checkout-bill.dto';
import { SyncStatus } from '@medingen/db';
import { BillingRepository } from './repository/billing.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BillCreatedEvent, BillCancelledEvent, SalesReturnEvent } from './events/bill-created.event';

@Injectable()
export class BillingService {
  private checkoutMutex = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: BillingRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async checkout(dto: CheckoutBillDto) {
    return new Promise((resolve, reject) => {
      this.checkoutMutex = this.checkoutMutex
        .then(async () => {
          try {
            const res = await this.executeCheckout(dto);
            resolve(res);
          } catch (e) {
            reject(e);
          }
        })
        .catch(() => {});
    });
  }

  private async executeCheckout(dto: CheckoutBillDto) {
    const now = new Date();
    
    // Generate unique bill number: BILL-YYYYMMDD-XXXXX
    const todayStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `BILL-${todayStr}-`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Find latest bill to compute sequence
      const lastInvoice = await tx.bill.findFirst({
        where: { billNumber: { startsWith: prefix } },
        orderBy: { billNumber: 'desc' },
      });

      let sequence = 1;
      if (lastInvoice) {
        const parts = lastInvoice.billNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }
      const billNumber = `${prefix}${sequence.toString().padStart(5, '0')}`;

      // 1. Customer registration on-the-fly
      let customerId = dto.customerId || null;
      if (!customerId && dto.customerMobile) {
        const mob = dto.customerMobile.trim();
        let customer = await tx.customer.findUnique({ where: { mobile: mob } });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: dto.customerName ? dto.customerName.trim() : 'Registered Walk-in',
              mobile: mob,
              syncStatus: SyncStatus.PENDING,
            },
          });
        }
        customerId = customer.id;
      }

      // Calculations counters
      let totalAmount = 0;
      let discountAmount = 0;
      let gstAmount = 0;
      let totalProfit = 0;

      const billItemsToCreate = [];
      const batchUpdates = [];
      const stockLedgersToCreate = [];

      // 2. Process each item (FEFO batch selection logic)
      for (const item of dto.items) {
        // Fetch active available batches for this product, sorted by expiryDate ASC (FEFO)
        const activeBatches = await tx.batch.findMany({
          where: {
            productId: item.productId,
            availableQty: { gt: 0 },
            expiryDate: { gt: now }, // Never sell expired batches
            status: 'ACTIVE',
            deletedAt: null,
          },
          orderBy: { expiryDate: 'asc' },
        });

        const totalAvailableStock = activeBatches.reduce((sum: number, b: any) => sum + b.availableQty, 0);
        if (totalAvailableStock < item.quantity) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          throw new BadRequestException(
            `Insufficient stock for medicine "${prod?.name || item.productId}". Requested: ${item.quantity}, Available: ${totalAvailableStock}.`
          );
        }

        let remainingQty = item.quantity;

        for (const batch of activeBatches) {
          const qtyToTake = Math.min(remainingQty, batch.availableQty);
          
          // Pricing rules
          const sellingPrice = item.customPrice !== undefined ? item.customPrice : batch.sellingPrice;
          const mrp = batch.mrp;
          
          // Line calculations
          const itemSubtotal = qtyToTake * sellingPrice;
          const itemDiscount = itemSubtotal * ((item.discountPercentage || 0) / 100);
          const taxableAmount = itemSubtotal - itemDiscount;
          const itemGst = taxableAmount * (batch.gstPercentage / 100);
          const lineTotal = taxableAmount + itemGst;

          // Profit calculations (taxable net - batch cost)
          const purchaseCost = qtyToTake * batch.purchasePrice;
          const profit = taxableAmount - purchaseCost;

          totalAmount += itemSubtotal;
          discountAmount += itemDiscount;
          gstAmount += itemGst;
          totalProfit += profit;

          // Prepare batch update
          const newAvailableQty = batch.availableQty - qtyToTake;
          const status = newAvailableQty === 0 ? 'EXHAUSTED' : batch.status;

          // Add to pending updates
          batchUpdates.push({
            id: batch.id,
            availableQty: newAvailableQty,
            status,
          });

          // Add bill item structure
          billItemsToCreate.push({
            batchId: batch.id,
            quantity: qtyToTake,
            sellingPrice,
            mrp,
            discountAmount: itemDiscount,
            gstPercentage: batch.gstPercentage,
            gstAmount: itemGst,
            totalAmount: lineTotal,
            syncStatus: SyncStatus.PENDING,
          });

          // Add ledger log
          stockLedgersToCreate.push({
            productId: item.productId,
            batchId: batch.id,
            transactionType: 'SALES',
            quantity: -qtyToTake,
            balanceQty: newAvailableQty,
            referenceNumber: billNumber,
            remarks: `POS Billing Checkout`,
            createdBy: 'CASHIER',
            syncStatus: SyncStatus.PENDING,
          });

          remainingQty -= qtyToTake;
          if (remainingQty === 0) break;
        }
      }

      // Update batches
      for (const update of batchUpdates) {
        await tx.batch.update({
          where: { id: update.id },
          data: {
            availableQty: update.availableQty,
            status: update.status,
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          },
        });
      }

      // 3. Create the completed bill
      const netAmount = Math.round(totalAmount - discountAmount + gstAmount);

      const bill = await tx.bill.create({
        data: {
          billNumber,
          customerId,
          totalAmount,
          discountAmount,
          gstAmount,
          netAmount,
          profitAmount: totalProfit,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentStatus,
          amountPaid: dto.amountPaid,
          invoiceType: dto.invoiceType,
          status: 'COMPLETED',
          cashierId: '00000000-0000-0000-0000-000000000000', // default cash desk uuid
          syncStatus: SyncStatus.PENDING,
          billItems: {
            create: billItemsToCreate,
          },
        },
        include: {
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

      // 4. Create split payments if MIXED, else one payment
      if (dto.paymentMethod === 'MIXED' && dto.payments && dto.payments.length > 0) {
        for (const p of dto.payments) {
          await tx.payment.create({
            data: {
              billId: bill.id,
              method: p.method,
              amount: p.amount,
              referenceNumber: p.referenceNumber,
              syncStatus: SyncStatus.PENDING,
            },
          });
        }
      } else {
        await tx.payment.create({
          data: {
            billId: bill.id,
            method: dto.paymentMethod,
            amount: netAmount,
            syncStatus: SyncStatus.PENDING,
          },
        });
      }

      // 5. Create stock ledger records
      for (const ledger of stockLedgersToCreate) {
        await tx.stockLedger.create({ data: ledger });
      }

      // 6. Recalculate inventory aggregates for all affected products
      const uniqueProductIds = Array.from(new Set(dto.items.map((it: any) => it.productId)));
      for (const prodId of uniqueProductIds) {
        const allProductBatches = await tx.batch.findMany({
          where: { productId: prodId, deletedAt: null },
        });

        let totalAvailable = 0;
        let totalReserved = 0;
        let totalDamaged = 0;
        let totalExpired = 0;

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
          where: { productId: prodId },
          create: {
            productId: prodId,
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

      // 7. If this bill was on hold, delete the hold record
      if (dto.holdBillId) {
        await tx.holdBill.delete({ where: { id: dto.holdBillId } });
      }

      // 8. Update customer credit balance for CREDIT sales
      if (dto.paymentMethod === 'CREDIT' && customerId) {
        const cust = await tx.customer.findUnique({ where: { id: customerId } });
        if (cust) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              creditBalance: cust.creditBalance + netAmount,
              syncStatus: SyncStatus.PENDING,
              updatedAt: new Date(),
            },
          });
        }
      }

      // 9. Drug Schedule Register — create PENDING entries for regulated medicines
      //    inside this transaction so rows are guaranteed to exist when the bill commits.
      const regulatedSchedules = ['Schedule G', 'Schedule H', 'Schedule H1', 'Schedule X', 'NDPS'];
      const customer = customerId
        ? await tx.customer.findUnique({ where: { id: customerId } })
        : null;

      for (const billItem of bill.billItems) {
        const product = billItem.batch.product;
        if (product.drugSchedule && regulatedSchedules.includes(product.drugSchedule)) {
          await tx.drugScheduleRegister.create({
            data: {
              invoiceId: bill.id,
              productId: product.id,
              scheduleType: product.drugSchedule,
              patientName: customer?.name || 'Walk-In Patient',
              doctorName: '',
              prescriptionNumber: '',
              batchNumber: billItem.batch.batchNumber,
              quantity: billItem.quantity,
              status: 'PENDING',
            },
          });
        }
      }

      return bill;
    });

    if (result) {
      this.eventEmitter.emit(
        'bill.created',
        new BillCreatedEvent(
          result.id,
          result.billNumber,
          result.invoiceType,
          result.totalAmount,
          result.netAmount,
        ),
      );
    }

    return result;
  }

  async holdBill(dto: HoldBillDto) {
    return this.repo.createHoldBill({
      customerId: dto.customerId || null,
      customerName: dto.customerName || null,
      customerMobile: dto.customerMobile || null,
      holdLabel: dto.holdLabel || `Label-${new Date().getTime().toString().slice(-4)}`,
      notes: dto.notes,
      items: {
        create: dto.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountPercentage: item.discountPercentage || 0,
          customPrice: item.customPrice,
        })),
      },
    });
  }

  async getHoldBills() {
    return this.repo.getHoldBills();
  }

  async deleteHoldBill(id: string) {
    return this.repo.deleteHoldBill(id);
  }

  // --- HISTORIES & REFUNDS ---
  async findAll(query: { search?: string; paymentMethod?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.search) {
      const searchTrim = query.search.trim();
      where.OR = [
        { billNumber: { contains: searchTrim, mode: 'insensitive' } },
        { customer: { name: { contains: searchTrim, mode: 'insensitive' } } },
        { customer: { mobile: { contains: searchTrim } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.repo.findManyBills({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.repo.countBills(where),
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
    const bill = await this.repo.findUniqueBill(id);

    if (!bill || bill.deletedAt) {
      throw new NotFoundException(`Invoice with ID "${id}" not found.`);
    }

    return bill;
  }

  async cancelBill(id: string, reason: string) {
    const bill = await this.findOne(id);
    if (bill.status === 'CANCELLED') {
      throw new BadRequestException('Invoice is already cancelled.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Restore stocks for all bill items
      for (const item of bill.billItems) {
        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
        });

        if (batch) {
          const newQty = batch.availableQty + item.quantity;
          const status = newQty > 0 && batch.status === 'EXHAUSTED' ? 'ACTIVE' : batch.status;

          await tx.batch.update({
            where: { id: batch.id },
            data: {
              availableQty: newQty,
              status,
              syncStatus: SyncStatus.PENDING,
              updatedAt: new Date(),
            },
          });

          // Stock ledger entry offset
          await tx.stockLedger.create({
            data: {
              productId: batch.productId,
              batchId: batch.id,
              transactionType: 'SALES_RETURN',
              quantity: item.quantity,
              balanceQty: newQty,
              referenceNumber: bill.billNumber,
              remarks: `Invoice Cancelled. Reason: ${reason}`,
              createdBy: 'CASHIER',
              syncStatus: SyncStatus.PENDING,
            },
          });

          // Recalculate inventory aggregate
          const allProductBatches = await tx.batch.findMany({
            where: { productId: batch.productId, deletedAt: null },
          });

          let totalAvailable = 0;
          let totalReserved = 0;
          let totalDamaged = 0;
          let totalExpired = 0;

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
            where: { productId: batch.productId },
            create: {
              productId: batch.productId,
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
      }

      // Mark bill as cancelled
      return tx.bill.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
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
    });

    if (result) {
      this.eventEmitter.emit(
        'bill.cancelled',
        new BillCancelledEvent(result.id, result.billNumber, reason),
      );
    }

    return result;
  }

  // --- SALES RETURNS ---
  async salesReturn(dto: SalesReturnDto) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: dto.billId },
      include: { billItems: true },
    });

    if (!bill || bill.status === 'CANCELLED') {
      throw new BadRequestException('Cannot return items from a cancelled bill.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      let refundValue = 0;

      for (const returnItem of dto.items) {
        const billItem = bill.billItems.find((bi) => bi.id === returnItem.billItemId);
        if (!billItem) {
          throw new NotFoundException(`Invoice Item with ID "${returnItem.billItemId}" not found.`);
        }

        const maxRefundable = billItem.quantity - billItem.returnedQty;
        if (returnItem.quantity > maxRefundable) {
          throw new BadRequestException(
            `Cannot return ${returnItem.quantity} items. Max returnable: ${maxRefundable}.`
          );
        }

        // 1. Update bill item returned quantities
        await tx.billItem.update({
          where: { id: billItem.id },
          data: {
            returnedQty: billItem.returnedQty + returnItem.quantity,
          },
        });

        // 2. Restore stock to batch
        const batch = await tx.batch.findUnique({
          where: { id: billItem.batchId },
        });

        if (batch) {
          const newQty = batch.availableQty + returnItem.quantity;
          const status = newQty > 0 && batch.status === 'EXHAUSTED' ? 'ACTIVE' : batch.status;

          await tx.batch.update({
            where: { id: batch.id },
            data: {
              availableQty: newQty,
              status,
              syncStatus: SyncStatus.PENDING,
              updatedAt: new Date(),
            },
          });

          // 3. Write stock ledger record
          await tx.stockLedger.create({
            data: {
              productId: batch.productId,
              batchId: batch.id,
              transactionType: 'SALES_RETURN',
              quantity: returnItem.quantity,
              balanceQty: newQty,
              referenceNumber: bill.billNumber,
              remarks: `Sales Return: ${returnItem.reason || 'None provided'}`,
              createdBy: 'CASHIER',
              syncStatus: SyncStatus.PENDING,
            },
          });

          // Recalculate inventory aggregates
          const allProductBatches = await tx.batch.findMany({
            where: { productId: batch.productId, deletedAt: null },
          });

          let totalAvailable = 0;
          let totalReserved = 0;
          let totalDamaged = 0;
          let totalExpired = 0;

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
            where: { productId: batch.productId },
            create: {
              productId: batch.productId,
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
      }

      // Check if all items in bill have been returned
      const updatedBillItems = await tx.billItem.findMany({
        where: { billId: dto.billId },
      });

      const allReturned = updatedBillItems.every((bi) => bi.quantity === bi.returnedQty);
      if (allReturned) {
        await tx.bill.update({
          where: { id: dto.billId },
          data: {
            status: 'CANCELLED',
            cancelReason: 'All items returned',
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          },
        });
      }

      return tx.bill.findUnique({
        where: { id: dto.billId },
        include: {
          customer: true,
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
    });

    if (result) {
      const returnedQty = dto.items.reduce((sum, item) => sum + item.quantity, 0);
      this.eventEmitter.emit(
        'sales.returned',
        new SalesReturnEvent(result.id, result.billNumber, returnedQty, dto.items),
      );
    }

    return result;
  }
}
