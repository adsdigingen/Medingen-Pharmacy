import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { MedingenApiGuard } from '../guards/medingen-api.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

describe('ApiKeyService & MedingenApiGuard Database Auth Tests', () => {
  let apiKeyService: ApiKeyService;
  let guard: MedingenApiGuard;
  let prismaMock: any;
  let auditLogsServiceMock: any;

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn((cb) => cb(prismaMock)),
      apiKey: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    auditLogsServiceMock = {
      log: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        MedingenApiGuard,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogsService, useValue: auditLogsServiceMock },
      ],
    }).compile();

    apiKeyService = module.get<ApiKeyService>(ApiKeyService);
    guard = module.get<MedingenApiGuard>(MedingenApiGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ApiKeyService.createKey', () => {
    it('should generate secure sk_live_ key and store hash (not plaintext)', async () => {
      const createdAt = new Date();
      prismaMock.apiKey.create.mockImplementation((args: any) => ({
        id: 'api-key-uuid-1',
        name: args.data.name,
        keyPrefix: args.data.keyPrefix,
        keyHash: args.data.keyHash,
        status: 'ACTIVE',
        createdAt,
        updatedAt: createdAt,
      }));

      const res = await apiKeyService.createKey('user-1', 'admin-user');

      expect(res.success).toBe(true);
      expect(res.apiKey).toBeDefined();
      expect(res.apiKey.startsWith('sk_live_')).toBe(true);
      expect(res.apiKey.length).toBeGreaterThan(40);
      expect(res.keyPrefix.startsWith('sk_live_')).toBe(true);

      // Verify DB storage: keyHash must NOT be plaintext apiKey
      expect(prismaMock.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            keyPrefix: res.keyPrefix,
            keyHash: expect.any(String),
          }),
        }),
      );

      const dbCallData = prismaMock.apiKey.create.mock.calls[0][0].data;
      expect(dbCallData.keyHash).not.toEqual(res.apiKey);
      expect(dbCallData.keyHash.length).toBe(64); // SHA-256 hex length

      // Verify audit log
      expect(auditLogsServiceMock.log).toHaveBeenCalledWith(
        'user-1',
        'admin-user',
        'MEDINGEN_INTEGRATION',
        'MEDINGEN_API_KEY_CREATED',
        'SETTINGS_DASHBOARD',
        expect.stringContaining(res.keyPrefix),
      );
      // Audit log must NOT contain raw apiKey
      expect(auditLogsServiceMock.log).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.stringContaining(res.apiKey),
      );
    });
  });

  describe('ApiKeyService.getStatus', () => {
    it('should return integration metadata without exposing full secret', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key-1',
        status: 'ACTIVE',
        keyPrefix: 'sk_live_a1b2c3d4',
        createdAt: new Date('2026-09-22T10:00:00Z'),
        lastUsedAt: new Date('2026-09-22T11:30:00Z'),
      });

      const status = await apiKeyService.getStatus();

      expect(status.configured).toBe(true);
      expect(status.status).toBe('ACTIVE');
      expect(status.keyPrefix).toBe('sk_live_a1b2c3d4');
      expect((status as any).apiKey).toBeUndefined();
      expect((status as any).keyHash).toBeUndefined();
      expect(status.endpoint).toBe('/api/integration/medingen/bills');
    });

    it('should report NOT_CONFIGURED when no keys exist in DB or env', async () => {
      delete process.env.MEDINGEN_BILLING_API_KEY;
      delete process.env.MEDINGEN_API_KEY;
      prismaMock.apiKey.findFirst.mockResolvedValue(null);

      const status = await apiKeyService.getStatus();

      expect(status.configured).toBe(false);
      expect(status.status).toBe('NOT_CONFIGURED');
      expect(status.keyPrefix).toBeNull();
    });
  });

  describe('ApiKeyService.regenerateKey', () => {
    it('should revoke previous active keys and return new secret', async () => {
      prismaMock.apiKey.create.mockImplementation((args: any) => ({
        id: 'key-2',
        keyPrefix: args.data.keyPrefix,
        keyHash: args.data.keyHash,
        status: 'ACTIVE',
        createdAt: new Date(),
      }));

      const res = await apiKeyService.regenerateKey('admin-id');

      expect(res.success).toBe(true);
      expect(res.apiKey.startsWith('sk_live_')).toBe(true);
      expect(prismaMock.apiKey.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
          data: expect.objectContaining({ status: 'REVOKED' }),
        }),
      );
      expect(auditLogsServiceMock.log).toHaveBeenCalledWith(
        'admin-id',
        'admin',
        'MEDINGEN_INTEGRATION',
        'MEDINGEN_API_KEY_REGENERATED',
        'SETTINGS_DASHBOARD',
        expect.stringContaining(res.keyPrefix),
      );
    });
  });

  describe('ApiKeyService.revokeKey', () => {
    it('should revoke active keys and log audit record', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key-1',
        keyPrefix: 'sk_live_revoking',
        status: 'ACTIVE',
      });

      const res = await apiKeyService.revokeKey('admin-id');

      expect(res.success).toBe(true);
      expect(prismaMock.apiKey.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
          data: expect.objectContaining({ status: 'REVOKED' }),
        }),
      );
      expect(auditLogsServiceMock.log).toHaveBeenCalledWith(
        'admin-id',
        'admin',
        'MEDINGEN_INTEGRATION',
        'MEDINGEN_API_KEY_REVOKED',
        'SETTINGS_DASHBOARD',
        expect.stringContaining('sk_live_revoking'),
      );
    });

    it('should throw BadRequestException if no active key to revoke', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue(null);

      await expect(apiKeyService.revokeKey('admin-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('MedingenApiGuard with Database Keys', () => {
    it('should allow active database key and update lastUsedAt', async () => {
      const validKey = 'med_test_validkey_1234567890abcdef';
      const keyHash = apiKeyService.hashKey(validKey);

      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-db-1',
        keyPrefix: 'med_test_validke',
        keyHash,
        status: 'ACTIVE',
        expiresAt: null,
      });

      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validKey}` },
            ip: '127.0.0.1',
          }),
        }),
      };

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(prismaMock.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'key-db-1' },
          data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
        }),
      );
    });

    it('should reject revoked database key with 401', async () => {
      const revokedKey = 'med_test_revokedkey_1234567890abcdef';
      const keyHash = apiKeyService.hashKey(revokedKey);

      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-db-2',
        keyPrefix: 'med_test_revoked',
        keyHash,
        status: 'REVOKED',
      });

      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${revokedKey}` },
            ip: '127.0.0.1',
          }),
        }),
      };

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });
});
