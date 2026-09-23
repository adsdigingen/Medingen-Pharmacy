import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { MedingenIntegrationService } from './medingen-integration.service';
import { MedingenApiGuard } from './guards/medingen-api.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateMedingenBillDto } from './dto/create-medingen-bill.dto';

describe('MedingenIntegrationService & Guard Unit Tests', () => {
  let service: MedingenIntegrationService;
  let guard: MedingenApiGuard;
  let prismaMock: any;
  let billingServiceMock: any;
  let auditLogsServiceMock: any;

  const validProductId = 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d';
  const testApiKey = 'test_secret_key_12345';

  beforeEach(async () => {
    process.env.MEDINGEN_BILLING_API_KEY = testApiKey;
    process.env.MEDINGEN_API_KEY = testApiKey;

    prismaMock = {
      bill: {
        findFirst: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      medingenBillRequest: {
        create: jest.fn().mockResolvedValue({ id: 'req-1' }),
      },
    };

    billingServiceMock = {
      checkout: jest.fn(),
    };

    auditLogsServiceMock = {
      log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedingenIntegrationService,
        MedingenApiGuard,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BillingService, useValue: billingServiceMock },
        { provide: AuditLogsService, useValue: auditLogsServiceMock },
      ],
    }).compile();

    service = module.get<MedingenIntegrationService>(MedingenIntegrationService);
    guard = module.get<MedingenApiGuard>(MedingenApiGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MedingenApiGuard Authentication', () => {
    it('Test 7a: should throw UnauthorizedException if Authorization header is missing', () => {
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {}, ip: '127.0.0.1' }),
        }),
      };
      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('Test 7b: should throw UnauthorizedException if Bearer token is invalid', () => {
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer wrong_token' },
            ip: '127.0.0.1',
          }),
        }),
      };
      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should allow access if Bearer token matches MEDINGEN_API_KEY', () => {
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${testApiKey}` },
            ip: '127.0.0.1',
          }),
        }),
      };
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('MedingenIntegrationService.createBill', () => {
    it('Test 1: should successfully create a bill when all products exist', async () => {
      const dto: CreateMedingenBillDto = {
        orderId: 'MED-ORD-10025',
        customer: {
          name: 'Raj Kumar',
          phone: '9876543210',
          email: 'raj@example.com',
          address: 'Chennai',
        },
        items: [{ productId: validProductId, quantity: 2 }],
        payment: { method: 'COD', amount: 450 },
      };

      prismaMock.bill.findFirst.mockResolvedValue(null);
      prismaMock.product.findFirst.mockResolvedValue({
        id: validProductId,
        name: 'Paracetamol 500mg',
      });
      prismaMock.customer.findUnique.mockResolvedValue({
        id: 'cust-uuid-1',
        name: 'Raj Kumar',
        mobile: '9876543210',
      });
      billingServiceMock.checkout.mockResolvedValue({
        id: 'bill-uuid-123',
        billNumber: 'INV-2026-00125',
        netAmount: 450,
      });

      const response = await service.createBill(dto, 'req-abc');

      expect(response).toEqual({
        success: true,
        status: 'GENERATED',
        orderId: 'MED-ORD-10025',
        invoiceId: 'bill-uuid-123',
        invoiceNumber: 'INV-2026-00125',
        totalAmount: 450,
        pdfUrl: null,
      });
      expect(billingServiceMock.checkout).toHaveBeenCalledTimes(1);
      expect(billingServiceMock.checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'MEDINGEN',
          externalOrderId: 'MED-ORD-10025',
          paymentMethod: 'COD',
          paymentStatus: 'PAID',
        }),
      );
    });

    it('Test 2: should reject with 404 PRODUCT_NOT_FOUND if any product does not exist', async () => {
      const dto: CreateMedingenBillDto = {
        orderId: 'MED-ORD-10026',
        customer: { name: 'Priya', phone: '9123456780' },
        items: [
          { productId: validProductId, quantity: 1 },
          { productId: 'non-existent-or-invalid-uuid', quantity: 2 },
        ],
      };

      prismaMock.bill.findFirst.mockResolvedValue(null);
      prismaMock.product.findFirst.mockImplementation(async ({ where }: any) => {
        if (where?.id === validProductId) {
          return { id: validProductId, name: 'Paracetamol' };
        }
        return null;
      });

      try {
        await service.createBill(dto);
        fail('Should have thrown HttpException');
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(err.getResponse()).toEqual({
          success: false,
          status: 'PRODUCT_NOT_FOUND',
          orderId: 'MED-ORD-10026',
          missingProducts: ['non-existent-or-invalid-uuid'],
        });
      }

      expect(billingServiceMock.checkout).not.toHaveBeenCalled();
    });

    it('Test 3: should reuse existing customer when mobile number matches', async () => {
      const dto: CreateMedingenBillDto = {
        orderId: 'MED-ORD-10027',
        customer: { name: 'Raj Kumar Updated', phone: '9876543210' },
        items: [{ productId: validProductId, quantity: 1 }],
      };

      prismaMock.bill.findFirst.mockResolvedValue(null);
      prismaMock.product.findFirst.mockResolvedValue({ id: validProductId });
      prismaMock.customer.findUnique.mockResolvedValue({
        id: 'cust-existing-99',
        name: 'Raj Kumar',
        mobile: '9876543210',
      });
      billingServiceMock.checkout.mockResolvedValue({
        id: 'bill-99',
        billNumber: 'INV-099',
        netAmount: 100,
      });

      await service.createBill(dto);

      expect(prismaMock.customer.create).not.toHaveBeenCalled();
      expect(billingServiceMock.checkout).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cust-existing-99' }),
      );
    });

    it('Test 4: should automatically create a new customer if phone is not found', async () => {
      const dto: CreateMedingenBillDto = {
        orderId: 'MED-ORD-10028',
        customer: { name: 'New User', phone: '9999888877' },
        items: [{ productId: validProductId, quantity: 1 }],
      };

      prismaMock.bill.findFirst.mockResolvedValue(null);
      prismaMock.product.findFirst.mockResolvedValue({ id: validProductId });
      prismaMock.customer.findUnique.mockResolvedValue(null);
      prismaMock.customer.create.mockResolvedValue({
        id: 'cust-new-1',
        name: 'New User',
        mobile: '9999888877',
      });
      billingServiceMock.checkout.mockResolvedValue({
        id: 'bill-100',
        billNumber: 'INV-100',
        netAmount: 200,
      });

      await service.createBill(dto);

      expect(prismaMock.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New User',
          mobile: '9999888877',
        }),
      });
    });

    it('Test 5: should return existing invoice without creating duplicate on retry', async () => {
      const dto: CreateMedingenBillDto = {
        orderId: 'MED-ORD-10025',
        customer: { name: 'Raj', phone: '9876543210' },
        items: [{ productId: validProductId, quantity: 2 }],
      };

      prismaMock.bill.findFirst.mockResolvedValue({
        id: 'bill-existing-uuid',
        billNumber: 'INV-2026-00125',
        netAmount: 450,
      });

      const response = await service.createBill(dto);

      expect(response).toEqual({
        success: true,
        status: 'GENERATED',
        orderId: 'MED-ORD-10025',
        invoiceId: 'bill-existing-uuid',
        invoiceNumber: 'INV-2026-00125',
        totalAmount: 450,
        pdfUrl: null,
      });
      expect(billingServiceMock.checkout).not.toHaveBeenCalled();
    });

    it('Test 9: should not commit partial records if underlying checkout fails', async () => {
      const dto: CreateMedingenBillDto = {
        orderId: 'MED-ORD-10029',
        customer: { name: 'Fail Case', phone: '9000000000' },
        items: [{ productId: validProductId, quantity: 100 }],
      };

      prismaMock.bill.findFirst.mockResolvedValue(null);
      prismaMock.product.findFirst.mockResolvedValue({ id: validProductId });
      prismaMock.customer.findUnique.mockResolvedValue({ id: 'c1', mobile: '9000000000' });
      billingServiceMock.checkout.mockRejectedValue(new Error('Insufficient stock in all batches'));

      await expect(service.createBill(dto)).rejects.toThrow('Insufficient stock in all batches');
      expect(prismaMock.medingenBillRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            externalOrderId: 'MED-ORD-10029',
          }),
        }),
      );
    });
  });
});
