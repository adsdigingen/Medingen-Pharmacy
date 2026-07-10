import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=========================================');
  console.log('Medingen Pharmacy ERP Database Seeding');
  console.log('=========================================\n');

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
