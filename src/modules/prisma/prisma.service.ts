import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();

    // Run automatic seeding if database is empty (0 users)
    try {
      const userCount = await this.user.count();
      if (userCount === 0) {
        console.log('[PrismaService] Clean database detected. Running automatic database seeding...');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Admin@123', salt);

        // 1. Seed Administrator User
        await this.user.create({
          data: {
            username: 'admin',
            passwordHash: passwordHash,
            role: 'ADMIN',
            status: true,
          },
        });
        console.log('[PrismaService] Seeded default Administrator user: admin / Admin@123');

        // 2. Seed System Settings
        await this.systemSettings.create({
          data: {
            id: 'singleton',
            storeName: 'Medingen Pharmacy',
            invoicePrefix: 'BILL-',
            poPrefix: 'PO-',
            printerType: '80mm',
            backupInterval: 'DAILY',
          },
        });
        console.log('[PrismaService] Seeded default System Settings');
        console.log('[PrismaService] Database seeding completed successfully.');
      }
    } catch (err: any) {
      console.error('[PrismaService] Database automatic seeding failed:', err.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

