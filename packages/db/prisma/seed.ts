import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper to manually parse and load .env files to process.env
function loadEnv(envPath: string) {
  if (fs.existsSync(envPath)) {
    try {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      for (const line of envConfig.split(/\r?\n/)) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual > 0) {
            const key = trimmed.substring(0, firstEqual).trim();
            let val = trimmed.substring(firstEqual + 1).trim();
            // Remove wrapping single or double quotes
            val = val.replace(/^['"]|['"]$/g, '');
            // Only set if not already defined in process.env
            if (!(key in process.env)) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Warning: Failed to load env file from ${envPath}`, e);
    }
  }
}

// Load env files in order of precedence: Root -> DB -> Cloud
loadEnv(path.join(__dirname, '../../../.env'));
loadEnv(path.join(__dirname, '../.env'));
loadEnv(path.join(__dirname, '../../../apps/cloud/.env'));

async function main() {
  console.log('\n=========================================');
  console.log('Medingen Pharmacy ERP Database Seeding');
  console.log('=========================================\n');

  const seedUserOnly = process.env.SEED_USER_ONLY === 'true';

  if (seedUserOnly) {
    console.log('SEED_USER_ONLY is set to true. Clearing all data in the database...\n');
    const tableNames = [
      'users',
      'categories',
      'manufacturers',
      'suppliers',
      'customers',
      'products',
      'batches',
      'inventories',
      'stock_ledgers',
      'stock_adjustments',
      'purchase_orders',
      'purchase_order_items',
      'purchase_returns',
      'purchase_return_items',
      'bills',
      'bill_items',
      'payments',
      'hold_bills',
      'hold_bill_items',
      'audit_logs',
      'system_settings',
      'license_info',
      'error_logs',
      'sync_queues',
      'sync_conflicts',
      'sync_histories',
      'device_registrations',
      'notifications',
      'sync_settings',
      'supplier_mappings',
      'drug_schedule_registers',
      'doctors'
    ];

    for (const tableName of tableNames) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
        console.log(`Truncated table: ${tableName}`);
      } catch (err: any) {
        console.warn(`Warning: Could not truncate table ${tableName}: ${err.message}`);
      }
    }
    console.log('\nAll data cleared successfully.');
  }

  // 1. Seed default Administrator user
  console.log('Creating Administrator...');

  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('\nAdministrator already exists.');
    console.log('Username : admin');
    console.log('Skipping creation.\n');
  } else {
    // Generate bcrypt hash with 10 salt rounds
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);

    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: passwordHash,
        role: 'ADMIN',
        status: true,
      },
    });

    console.log('\n✓ Administrator Created Successfully');
    console.log('Username : admin');
    console.log('Role     : ADMIN\n');
  }

  if (seedUserOnly) {
    console.log('\n=========================================');
    console.log('Database Seeding Completed (USER ONLY MODE)');
    console.log('=========================================');
    console.log('\n✔ Administrator account: admin / Admin@123');
    console.log('✔ All other tables cleared');
    console.log('✔ System and Sync settings skipped as requested\n');
    return;
  }

  // 2. Seed default System Settings (singleton)
  const existingSettings = await prisma.systemSettings.findUnique({
    where: { id: 'singleton' },
  });

  if (!existingSettings) {
    await prisma.systemSettings.create({
      data: {
        id: 'singleton',
        storeName: 'Medingen Pharmacy',
        invoicePrefix: 'INV-',
        poPrefix: 'PO-',
        printerType: '80mm',
        backupInterval: 'DAILY',
        defaultOfflineMarkup: 50.0,
        defaultOnlineMarkup: 85.0,
        defaultGst: 12.0,
        defaultRetailDiscount: 0.0,
      },
    });
    console.log('✓ Default System Settings Created');
  } else {
    console.log('✓ System Settings already exist. Skipping.');
  }

  // 3. Seed default Sync Settings (singleton)
  const existingSyncSettings = await prisma.syncSettings.findUnique({
    where: { id: 'sync_singleton' },
  });

  if (!existingSyncSettings) {
    await prisma.syncSettings.create({
      data: {
        id: 'sync_singleton',
        cloudApiUrl: 'http://localhost:3002',
        syncIntervalMs: 30000,
        syncEnabled: true,
      },
    });
    console.log('✓ Default Sync Settings Created');
  } else {
    console.log('✓ Sync Settings already exist. Skipping.');
  }

  console.log('\n=========================================');
  console.log('Database Seeding Completed Successfully');
  console.log('=========================================');
  console.log('\n✔ Administrator account: admin / Admin@123');
  console.log('✔ System configuration initialized');
  console.log('✔ No demo products seeded — ready for real data import\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

