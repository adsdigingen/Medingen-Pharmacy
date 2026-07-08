import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './modules/prisma/prisma.service';

@Controller()
export class AppController {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get(['', 'health'])
  async getHealth() {
    let dbStatus = 'CONNECTED';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'DISCONNECTED';
    }

    return {
      status: dbStatus === 'CONNECTED' ? 'HEALTHY' : 'UNHEALTHY',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
