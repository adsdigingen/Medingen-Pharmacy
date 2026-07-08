import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class JwtService {
  // Use a stable secret from env — a random secret would invalidate all tokens on every server restart
  private static readonly secret: string =
    process.env.JWT_SECRET ||
    'medingen-pharmacy-local-jwt-secret-key-2024-stable';


  /**
   * Signs a payload into a JWT HS256 token.
   * @param payload Payload data to embed
   * @param expiresInSeconds Lifetime in seconds (default: 8 hours)
   */
  static sign(payload: any, expiresInSeconds = 28800): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');

    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const fullPayload = { ...payload, exp };
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Verifies and decodes a JWT HS256 token.
   * Returns decoded payload if signature and expiration are valid, otherwise null.
   * @param token JWT token string
   */
  static verify(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const [headerB64, payloadB64, signature] = parts;

    // Verify signature match
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null; // Signature verification failed
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      
      // Check expiration
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        return null; // Token expired
      }

      return payload;
    } catch (e) {
      return null;
    }
  }
}
