import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceUuid = request.headers['x-device-uuid'];
    const apiKey = request.headers['x-api-key'];

    if (!deviceUuid || !apiKey) {
      throw new UnauthorizedException('Device synchronization credentials (x-device-uuid, x-api-key) are missing.');
    }

    const registration = await this.prisma.deviceRegistration.findUnique({
      where: { deviceUuid: deviceUuid as string },
    });

    if (!registration || registration.apiKey !== apiKey) {
      throw new UnauthorizedException('Invalid device UUID or API Key authorization.');
    }

    return true;
  }
}
