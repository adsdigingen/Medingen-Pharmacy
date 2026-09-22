import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkerRegistry } from '../workers/worker-registry';
import * as os from 'os';

@Injectable()
export class DiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: WorkerRegistry,
  ) {}

  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        database: 'CONNECTED',
      };
    } catch (e: any) {
      return {
        status: 'UNHEALTHY',
        timestamp: new Date().toISOString(),
        database: 'DISCONNECTED',
        error: e.message,
      };
    }
  }

  async getStatus() {
    const health = await this.getHealth();
    
    // OS metrics
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;

    // Database counts
    let counts = {};
    if (health.status === 'HEALTHY') {
      const [products, batches, bills, customers] = await Promise.all([
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.batch.count({ where: { deletedAt: null } }),
        this.prisma.bill.count({ where: { deletedAt: null } }),
        this.prisma.customer.count(),
      ]);
      counts = { products, batches, bills, customers };
    }

    // Workers status
    const workers = this.registry.getAllWorkers().map(w => ({
      name: w.name,
      enabled: w.enabled,
      isExecuting: w.isExecuting,
      lastExecutedAt: w.lastExecutedAt,
      lastError: w.lastError,
    }));

    return {
      appName: 'Medingen Pharmacy ERP',
      version: '1.0.0',
      health,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpuCores: os.cpus().length,
        uptimeSeconds: os.uptime(),
        memory: {
          freeGb: (freeMem / (1024 * 1024 * 1024)).toFixed(2),
          totalGb: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
          usagePercentage: memUsage.toFixed(2),
        },
      },
      databaseMetrics: counts,
      workers,
    };
  }
}
