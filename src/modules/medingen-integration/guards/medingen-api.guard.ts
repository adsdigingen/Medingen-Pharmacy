import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiKeyService } from '../services/api-key.service';

@Injectable()
export class MedingenApiGuard implements CanActivate {
  private readonly logger = new Logger(MedingenApiGuard.name);

  constructor(
    @Optional() private readonly apiKeyService?: ApiKeyService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader =
      request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      this.logger.warn(
        `Medingen API request rejected: Missing Authorization header from ${request.ip}`,
      );
      throw new UnauthorizedException('Missing Authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn(
        `Medingen API request rejected: Authorization header must use Bearer scheme from ${request.ip}`,
      );
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected "Bearer <token>"',
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    // When ApiKeyService is provided, run asynchronous database verification
    if (this.apiKeyService) {
      return this.validateWithService(token, request.ip);
    }

    // Synchronous fallback when ApiKeyService is not injected (e.g. standalone unit tests)
    return this.validateWithEnvFallback(token, request.ip);
  }

  private async validateWithService(token: string, ip: string): Promise<boolean> {
    try {
      const dbResult = await this.apiKeyService!.validateAndTrackKey(token);
      if (dbResult === true) {
        return true;
      }
      if (dbResult === false) {
        this.logger.warn(`Medingen API request rejected: Revoked/expired key from ${ip}`);
        throw new UnauthorizedException('Invalid or revoked API key');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`Error verifying API key in database: ${(err as any).message}`);
    }

    // Fallback to env key if not found in database
    return this.validateWithEnvFallback(token, ip);
  }

  private validateWithEnvFallback(token: string, ip: string): boolean {
    const configuredKey = (
      process.env.MEDINGEN_BILLING_API_KEY ||
      process.env.MEDINGEN_API_KEY ||
      ''
    ).trim();

    if (!configuredKey) {
      this.logger.warn(`Medingen API request rejected: No valid key configured from ${ip}`);
      throw new UnauthorizedException('Invalid API key');
    }

    const tokenBuffer = Buffer.from(token, 'utf-8');
    const configuredBuffer = Buffer.from(configuredKey, 'utf-8');

    if (
      tokenBuffer.length !== configuredBuffer.length ||
      !crypto.timingSafeEqual(tokenBuffer, configuredBuffer)
    ) {
      this.logger.warn(`Medingen API request rejected: Invalid API key attempt from ${ip}`);
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
