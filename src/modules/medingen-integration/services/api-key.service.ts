import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { ApiKey } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

export interface ApiKeyStatusResponse {
  configured: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'NOT_CONFIGURED';
  keyPrefix?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  endpoint: string;
  authMethod: string;
}

export interface ApiKeyCreatedResponse {
  success: boolean;
  message: string;
  apiKey: string;
  keyPrefix: string;
  createdAt: string;
}

export interface ApiKeyRegeneratedResponse {
  success: boolean;
  message: string;
  apiKey: string;
  keyPrefix: string;
}

export interface ApiKeyRevokedResponse {
  success: boolean;
  message: string;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private static readonly ENDPOINT = '/api/integration/medingen/bills';
  private static readonly AUTH_METHOD = 'Bearer Token';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Generates a cryptographically secure random API key.
   * Format: sk_live_<48 hex chars> (192 bits of entropy)
   */
  private generateRawSecret(): string {
    const randomHex = crypto.randomBytes(24).toString('hex');
    return `sk_live_${randomHex}`;
  }

  /**
   * Computes SHA-256 one-way cryptographic hash of the raw API key.
   */
  hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
  }

  /**
   * Extracts safe prefix for public identification and audit trail.
   * e.g. "sk_live_a1b2c3d4"
   */
  private extractPrefix(rawKey: string): string {
    return rawKey.substring(0, 16);
  }

  /**
   * Returns current integration status and metadata without exposing secret.
   */
  async getStatus(): Promise<ApiKeyStatusResponse> {
    // 1. Check for most recently modified key in database
    const latestKey = await this.prisma.apiKey.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (latestKey) {
      return {
        configured: true,
        status: latestKey.status as 'ACTIVE' | 'REVOKED',
        keyPrefix: latestKey.keyPrefix,
        createdAt: latestKey.createdAt.toISOString(),
        lastUsedAt: latestKey.lastUsedAt ? latestKey.lastUsedAt.toISOString() : null,
        endpoint: ApiKeyService.ENDPOINT,
        authMethod: ApiKeyService.AUTH_METHOD,
      };
    }

    // 2. Fallback check for environment-configured key
    const envKey = (
      process.env.MEDINGEN_BILLING_API_KEY ||
      process.env.MEDINGEN_API_KEY ||
      ''
    ).trim();
    if (envKey) {
      return {
        configured: true,
        status: 'ACTIVE',
        keyPrefix: envKey.startsWith('sk_live_') ? envKey.substring(0, 16) : 'env_configured',
        createdAt: null,
        lastUsedAt: null,
        endpoint: ApiKeyService.ENDPOINT,
        authMethod: ApiKeyService.AUTH_METHOD,
      };
    }

    // 3. Not configured
    return {
      configured: false,
      status: 'NOT_CONFIGURED',
      keyPrefix: null,
      createdAt: null,
      lastUsedAt: null,
      endpoint: ApiKeyService.ENDPOINT,
      authMethod: ApiKeyService.AUTH_METHOD,
    };
  }

  /**
   * Creates a new API key.
   * Revokes any existing active keys, creates the new record, logs audit, and returns raw key once.
   */
  async createKey(
    userId?: string,
    username?: string,
    name?: string,
  ): Promise<ApiKeyCreatedResponse> {
    const rawSecret = this.generateRawSecret();
    const keyHash = this.hashKey(rawSecret);
    const keyPrefix = this.extractPrefix(rawSecret);

    const now = new Date();

    const createdRecord = await this.prisma.$transaction(async (tx) => {
      // Revoke any previous active keys
      await tx.apiKey.updateMany({
        where: { status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: now,
        },
      });

      return tx.apiKey.create({
        data: {
          name: name || 'Medingen Platform Key',
          keyPrefix,
          keyHash,
          status: 'ACTIVE',
          createdBy: userId || null,
        },
      });
    });

    // Audit logging (never includes raw secret)
    try {
      await this.auditLogsService.log(
        userId || null,
        username || 'admin',
        'MEDINGEN_INTEGRATION',
        'MEDINGEN_API_KEY_CREATED',
        'SETTINGS_DASHBOARD',
        JSON.stringify({
          action: 'MEDINGEN_API_KEY_CREATED',
          keyPrefix,
          timestamp: now.toISOString(),
          userId: userId || null,
        }),
      );
    } catch (auditErr: any) {
      this.logger.warn(`Failed to log audit for API key creation: ${auditErr.message}`);
    }

    this.logger.log(`Created new Medingen API key with prefix: ${keyPrefix}`);

    return {
      success: true,
      message: 'API key created successfully',
      apiKey: rawSecret,
      keyPrefix,
      createdAt: createdRecord.createdAt.toISOString(),
    };
  }

  /**
   * Regenerates API key.
   * Immediately revokes active key, generates new key, and returns new raw secret once.
   */
  async regenerateKey(
    userId?: string,
    username?: string,
  ): Promise<ApiKeyRegeneratedResponse> {
    const rawSecret = this.generateRawSecret();
    const keyHash = this.hashKey(rawSecret);
    const keyPrefix = this.extractPrefix(rawSecret);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Revoke active keys
      await tx.apiKey.updateMany({
        where: { status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: now,
        },
      });

      return tx.apiKey.create({
        data: {
          name: 'Medingen Platform Key (Regenerated)',
          keyPrefix,
          keyHash,
          status: 'ACTIVE',
          createdBy: userId || null,
        },
      });
    });

    // Audit logging
    try {
      await this.auditLogsService.log(
        userId || null,
        username || 'admin',
        'MEDINGEN_INTEGRATION',
        'MEDINGEN_API_KEY_REGENERATED',
        'SETTINGS_DASHBOARD',
        JSON.stringify({
          action: 'MEDINGEN_API_KEY_REGENERATED',
          keyPrefix,
          timestamp: now.toISOString(),
          userId: userId || null,
        }),
      );
    } catch (auditErr: any) {
      this.logger.warn(`Failed to log audit for API key regeneration: ${auditErr.message}`);
    }

    this.logger.log(`Regenerated Medingen API key with prefix: ${keyPrefix}`);

    return {
      success: true,
      message: 'API key regenerated successfully',
      apiKey: rawSecret,
      keyPrefix,
    };
  }

  /**
   * Revokes the active Medingen API key.
   * Future requests with this key will fail with 401.
   */
  async revokeKey(userId?: string, username?: string): Promise<ApiKeyRevokedResponse> {
    const activeKey = await this.prisma.apiKey.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!activeKey) {
      throw new BadRequestException('No active Medingen API key found to revoke');
    }

    const now = new Date();

    await this.prisma.apiKey.updateMany({
      where: { status: 'ACTIVE' },
      data: {
        status: 'REVOKED',
        revokedAt: now,
      },
    });

    // Audit logging
    try {
      await this.auditLogsService.log(
        userId || null,
        username || 'admin',
        'MEDINGEN_INTEGRATION',
        'MEDINGEN_API_KEY_REVOKED',
        'SETTINGS_DASHBOARD',
        JSON.stringify({
          action: 'MEDINGEN_API_KEY_REVOKED',
          keyPrefix: activeKey.keyPrefix,
          timestamp: now.toISOString(),
          userId: userId || null,
        }),
      );
    } catch (auditErr: any) {
      this.logger.warn(`Failed to log audit for API key revocation: ${auditErr.message}`);
    }

    this.logger.log(`Revoked Medingen API key with prefix: ${activeKey.keyPrefix}`);

    return {
      success: true,
      message: 'API key revoked successfully',
    };
  }

  /**
   * Validates raw Bearer token against database-stored keys.
   * If valid and ACTIVE: updates lastUsedAt and returns true.
   * If key exists but is REVOKED or EXPIRED: returns false.
   * If key does not exist in DB: returns null (allowing caller to test fallback).
   */
  async validateAndTrackKey(rawToken: string): Promise<boolean | null> {
    if (!rawToken) return null;

    const computedHash = this.hashKey(rawToken);

    const record = await this.prisma.apiKey.findUnique({
      where: { keyHash: computedHash },
    });

    if (!record) {
      return null; // Not in DB, may fallback to env
    }

    if (record.status !== 'ACTIVE') {
      this.logger.warn(`Rejected Medingen API request: Key ${record.keyPrefix} is ${record.status}`);
      return false;
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      this.logger.warn(`Rejected Medingen API request: Key ${record.keyPrefix} is expired`);
      return false;
    }

    // Update lastUsedAt asynchronously
    this.prisma.apiKey
      .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: any) => {
        this.logger.warn(`Failed to update lastUsedAt for key ${record.keyPrefix}: ${err.message}`);
      });

    return true;
  }
}
