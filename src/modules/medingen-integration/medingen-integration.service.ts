import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateMedingenBillDto } from './dto/create-medingen-bill.dto';
import {
  MedingenBillSuccessResponse,
  MedingenProductNotFoundResponse,
} from './types/medingen.types';
import {
  MEDINGEN_SOURCE,
  MEDINGEN_STATUS,
  MEDINGEN_ERROR_CODES,
} from './constants/medingen.constants';
import { CheckoutBillDto } from '../billing/dto/checkout-bill.dto';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class MedingenIntegrationService {
  private readonly logger = new Logger(MedingenIntegrationService.name);
  private orderMutex = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Main entry point for headless Medingen order bill creation.
   * Handles idempotency, product existence validation, customer lookup/creation,
   * underlying BillingService checkout execution, integration logging, and audit.
   */
  async createBill(
    dto: CreateMedingenBillDto,
    requestId?: string,
  ): Promise<MedingenBillSuccessResponse> {
    // Sequential mutex lock for concurrent duplicate safety
    return new Promise<MedingenBillSuccessResponse>((resolve, reject) => {
      this.orderMutex = this.orderMutex
        .then(async () => {
          try {
            const result = await this.executeCreateBill(dto, requestId);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        })
        .catch(() => {});
    });
  }

  private async executeCreateBill(
    dto: CreateMedingenBillDto,
    requestId?: string,
  ): Promise<MedingenBillSuccessResponse> {
    const orderId = dto.orderId.trim();

    // 1. Idempotency Check: Return existing bill if already generated
    const existingBill = await this.prisma.bill.findFirst({
      where: {
        source: MEDINGEN_SOURCE,
        externalOrderId: orderId,
        deletedAt: null,
      },
    });

    if (existingBill) {
      this.logger.log(
        `[MedingenIdempotency] Order "${orderId}" already processed. Returning existing invoice "${existingBill.billNumber}".`,
      );
      return {
        success: true,
        status: MEDINGEN_STATUS.GENERATED,
        orderId,
        invoiceId: existingBill.id,
        invoiceNumber: existingBill.billNumber,
        totalAmount: existingBill.netAmount,
        pdfUrl: null,
      };
    }

    // 2. Product Validation: Every productId must exist in Billing Software Product table
    const missingProducts: string[] = [];

    for (const item of dto.items) {
      const pid = String(item.productId || '').trim();

      if (!pid || !UUID_REGEX.test(pid)) {
        missingProducts.push(item.productId);
        continue;
      }

      const product = await this.prisma.product.findFirst({
        where: { id: pid, deletedAt: null },
      });

      if (!product) {
        missingProducts.push(item.productId);
      }
    }

    if (missingProducts.length > 0) {
      this.logger.warn(
        `[MedingenValidation] Order "${orderId}" rejected. Missing products: ${JSON.stringify(missingProducts)}`,
      );

      // Record failed integration attempt
      await this.logIntegrationRequest(
        orderId,
        MEDINGEN_STATUS.FAILED,
        null,
        requestId,
        MEDINGEN_ERROR_CODES.PRODUCT_NOT_FOUND,
        `Products not found: ${missingProducts.join(', ')}`,
      );

      const notFoundPayload: MedingenProductNotFoundResponse = {
        success: false,
        status: MEDINGEN_STATUS.PRODUCT_NOT_FOUND,
        orderId,
        missingProducts,
      };

      throw new HttpException(notFoundPayload, HttpStatus.NOT_FOUND);
    }

    // 3. Customer Resolution: Find or create customer by phone number
    const mobile = dto.customer.phone.trim();
    let customer = await this.prisma.customer.findUnique({
      where: { mobile },
    });

    if (!customer) {
      this.logger.log(
        `[MedingenCustomer] Creating new customer for phone "${mobile}" (${dto.customer.name})`,
      );
      customer = await this.prisma.customer.create({
        data: {
          name: dto.customer.name.trim() || 'Medingen Customer',
          mobile,
          syncStatus: 'PENDING',
        },
      });
    }

    // 4. Map to existing Billing Checkout DTO
    const paymentMethod = dto.payment?.method
      ? dto.payment.method.trim().toUpperCase()
      : 'COD';
    const amountPaid =
      dto.payment?.amount !== undefined && dto.payment.amount > 0
        ? dto.payment.amount
        : 0;
    const paymentStatus = amountPaid > 0 ? 'PAID' : 'PENDING';

    const checkoutDto: CheckoutBillDto = {
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      paymentMethod,
      paymentStatus,
      amountPaid,
      invoiceType: 'TAX',
      source: MEDINGEN_SOURCE,
      externalOrderId: orderId,
      items: dto.items.map((item) => ({
        productId: item.productId.trim(),
        quantity: item.quantity,
      })),
    };

    // 5. Execute checkout using the existing billing engine
    let createdBill: any;
    try {
      createdBill = await this.billingService.checkout(checkoutDto);
    } catch (checkoutError: any) {
      // Check if duplicate race condition occurred
      if (
        checkoutError?.message?.includes('Unique constraint') ||
        checkoutError?.code === 'P2002'
      ) {
        const raceBill = await this.prisma.bill.findFirst({
          where: {
            source: MEDINGEN_SOURCE,
            externalOrderId: orderId,
            deletedAt: null,
          },
        });
        if (raceBill) {
          return {
            success: true,
            status: MEDINGEN_STATUS.GENERATED,
            orderId,
            invoiceId: raceBill.id,
            invoiceNumber: raceBill.billNumber,
            totalAmount: raceBill.netAmount,
            pdfUrl: null,
          };
        }
      }

      this.logger.error(
        `[MedingenBillingError] Order "${orderId}" checkout failed: ${checkoutError?.message || checkoutError}`,
      );

      await this.logIntegrationRequest(
        orderId,
        MEDINGEN_STATUS.FAILED,
        null,
        requestId,
        checkoutError?.errorCode || 'BILLING_ENGINE_ERROR',
        checkoutError?.message || 'Underlying billing engine failed to process the bill',
      );

      throw checkoutError;
    }

    // 6. Log successful integration request & audit
    await this.logIntegrationRequest(
      orderId,
      MEDINGEN_STATUS.SUCCESS,
      createdBill.id,
      requestId,
    );

    try {
      await this.auditLogsService.log(
        null,
        'MEDINGEN_API',
        'BILLING',
        'MEDINGEN_BILL_CREATED',
        'SERVER_API',
        JSON.stringify({
          orderId,
          invoiceId: createdBill.id,
          invoiceNumber: createdBill.billNumber,
          totalAmount: createdBill.netAmount,
          customerName: customer.name,
          customerPhone: customer.mobile,
          itemsCount: dto.items.length,
        }),
      );
    } catch (auditErr) {
      this.logger.warn(`Failed to write audit log for Medingen bill ${createdBill.id}:`, auditErr);
    }

    this.logger.log(
      `[MedingenSuccess] Order "${orderId}" successfully billed: Invoice "${createdBill.billNumber}" (ID: ${createdBill.id}), Net Amount: ₹${createdBill.netAmount}`,
    );

    return {
      success: true,
      status: MEDINGEN_STATUS.GENERATED,
      orderId,
      invoiceId: createdBill.id,
      invoiceNumber: createdBill.billNumber,
      totalAmount: createdBill.netAmount,
      pdfUrl: null,
    };
  }

  /**
   * Helper to write integration request log
   */
  private async logIntegrationRequest(
    externalOrderId: string,
    status: string,
    billId?: string | null,
    requestId?: string,
    errorCode?: string | null,
    errorMessage?: string | null,
  ) {
    try {
      await this.prisma.medingenBillRequest.create({
        data: {
          externalOrderId,
          status,
          billId: billId || null,
          requestId: requestId || null,
          errorCode: errorCode || null,
          errorMessage: errorMessage || null,
          processedAt: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to log MedingenBillRequest for order ${externalOrderId}: ${e.message}`);
    }
  }
}
