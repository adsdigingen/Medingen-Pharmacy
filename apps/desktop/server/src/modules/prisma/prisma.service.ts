import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, SyncStatus } from '@medingen/db';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    // Run database migrations on start in production environment
    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('[PrismaService] Running automatic database migrations...');
        
        // Dynamically find node_modules folder by traversing up from __dirname
        let currentDir = __dirname;
        let nodeModulesPath = '';
        for (let i = 0; i < 10; i++) {
          const testPath = path.join(currentDir, 'node_modules');
          if (fs.existsSync(testPath)) {
            nodeModulesPath = testPath;
            break;
          }
          const parent = path.dirname(currentDir);
          if (parent === currentDir) break;
          currentDir = parent;
        }

        if (nodeModulesPath) {
          const prismaCliPath = path.join(nodeModulesPath, 'prisma/build/index.js');
          const dbPrismaPath = path.join(nodeModulesPath, '@medingen/db/prisma');
          const schemaPath = path.join(dbPrismaPath, 'schema.prisma');
          
          console.log('[PrismaService] Found node_modules at:', nodeModulesPath);
          console.log('[PrismaService] Using Prisma CLI:', prismaCliPath);
          console.log('[PrismaService] Using Schema:', schemaPath);
          
          if (fs.existsSync(prismaCliPath) && fs.existsSync(schemaPath)) {
            // Run migrate deploy using Electron's embedded node engine (process.execPath)
            const execPath = process.execPath;
            const cmd = `"${execPath}" "${prismaCliPath}" migrate deploy --schema="${schemaPath}"`;
            console.log('[PrismaService] Executing cmd:', cmd);
            execSync(cmd, {
              env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: '1',
              },
              stdio: 'inherit'
            });
            console.log('[PrismaService] Database migrations completed successfully.');
          } else {
            console.error('[PrismaService] Missing required Prisma files: CLI exists:', fs.existsSync(prismaCliPath), 'Schema exists:', fs.existsSync(schemaPath));
            // Fallback
            execSync('npx prisma migrate deploy', { stdio: 'inherit' });
          }
        } else {
          console.warn('[PrismaService] node_modules folder not found in parent path traverse!');
          execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        }
      } catch (err: any) {
        console.error('[PrismaService] Database migration execution failed:', err.message);
      }
    }

    await this.$connect();

    // Run automatic seeding if database is empty (0 users)
    try {
      const userCount = await this.user.count();
      if (userCount === 0) {
        console.log('[PrismaService] Clean database detected. Running automatic database seeding...');
        const bcrypt = require('bcryptjs');
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
            invoicePrefix: 'INV-',
            poPrefix: 'PO-',
            printerType: '80mm',
            backupInterval: 'DAILY',
          },
        });
        console.log('[PrismaService] Seeded default System Settings');

        // 3. Seed Sync Settings
        await this.syncSettings.create({
          data: {
            id: 'sync_singleton',
            cloudApiUrl: 'http://localhost:3002',
            syncIntervalMs: 30000,
            syncEnabled: true,
          },
        });
        console.log('[PrismaService] Seeded default Sync Settings');
        console.log('[PrismaService] Database seeding completed successfully.');
      }
    } catch (err: any) {
      console.error('[PrismaService] Database automatic seeding failed:', err.message);
    }

    // Register Sync Middleware
    this.$use(async (params, next) => {
      const result = await next(params);

      const syncEnabledModels = ['Category', 'Manufacturer', 'Supplier', 'Product', 'Batch', 'Bill', 'Payment', 'Customer'];
      const modelName = params.model;

      if (modelName && syncEnabledModels.includes(modelName)) {
        const writeActions = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany'];
        if (writeActions.includes(params.action)) {
          try {
            const entityName = modelName.toUpperCase();
            const actionUpper = params.action.toUpperCase();
            const operation = actionUpper.startsWith('CREATE') ? 'CREATE' : actionUpper.startsWith('DELETE') ? 'DELETE' : 'UPDATE';

            // Get target ID
            let entityId = 'BATCH_OPERATION';
            if (result && typeof result === 'object' && result.id) {
              entityId = result.id;
            } else if (params.args?.where?.id) {
              entityId = params.args.where.id;
            }

            // Exclude sync queue tables to avoid recursion loops
            if (entityName !== 'SYNCQUEUE' && entityName !== 'SYNCCONFLICT' && entityName !== 'SYNCHISTORY') {
              // Direct insert using raw Prisma client bypass
              await this.syncQueue.create({
                data: {
                  entityName,
                  entityId,
                  operation,
                  payload: JSON.stringify(result || params.args?.data || {}),
                  syncStatus: SyncStatus.PENDING,
                },
              });
            }
          } catch (e: any) {
            console.error('Prisma sync middleware warning:', e.message);
          }
        }
      }

      return result;
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
