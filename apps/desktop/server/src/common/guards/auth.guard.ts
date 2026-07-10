import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { JwtService } from '../domain/jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Always bypass public endpoints (login, health checks)
    const publicPaths = ['/users-management/login', '/diagnostics/health', '/maintenance/health'];
    if (request.url && publicPaths.some(p => request.url.includes(p))) {
      return true;
    }

    let userId: string | undefined;
    let userRole: string | undefined;

    let authHeader = request.headers['authorization'];
    if (!authHeader && request.query && request.query.token) {
      authHeader = `Bearer ${request.query.token}`;
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = JwtService.verify(token);
      if (payload) {
        userId = payload.id;
        userRole = payload.role;
      } else {
        throw new UnauthorizedException('Authentication token is invalid or expired.');
      }
    }

    // Secure fallback: Only allow raw headers in development mode
    if (!userId || !userRole) {
      const isDev = process.env.NODE_ENV !== 'production';
      const devUserId = request.headers['x-user-id'];
      const devUserRole = request.headers['x-user-role'];

      if (isDev && devUserId && devUserRole) {
        userId = devUserId as string;
        userRole = devUserRole as string;
      } else {
        throw new UnauthorizedException('Authentication token is missing or invalid.');
      }
    }

    // Lookup user in DB to ensure they exist and are active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user not found.');
    }

    if (!user.status) {
      throw new UnauthorizedException('User account is deactivated.');
    }

    // Verify role matches (prevent tampering in dev header injection)
    if (user.role !== userRole) {
      throw new UnauthorizedException('Authenticated role mismatch.');
    }

    request.user = user;
    return true;
  }
}
