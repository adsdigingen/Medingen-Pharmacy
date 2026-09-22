import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// Helper to manually parse and load .env files if present locally
function loadEnv(envPath: string) {
  if (fs.existsSync(envPath)) {
    try {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      for (const line of envConfig.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual > 0) {
            const key = trimmed.substring(0, firstEqual).trim();
            let val = trimmed.substring(firstEqual + 1).trim();
            val = val.replace(/^['"]|['"]$/g, '');
            if (!(key in process.env)) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // Ignored - rely on ambient process.env
    }
  }
}

// Load env files in order of precedence: Root -> Backend
loadEnv(path.join(__dirname, '../../.env'));
loadEnv(path.join(__dirname, '../.env'));

async function main() {
  console.log('\n=========================================');
  console.log('Medingen Pharmacy - Explicit Database Seed');
  console.log('=========================================\n');

  // 1. Seed Initial Administrator User (if configured)
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    console.log(`[Seed] Administrator "${adminUsername}" already exists. Skipping user creation.`);
  } else if (adminPassword) {
    if (adminPassword.length < 8) {
      throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
    }
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        role: Role.ADMIN,
        status: true,
      },
    });
    console.log(`[Seed] Successfully created administrator: "${adminUsername}" (Role: ADMIN)`);
  } else {
    console.log(
      `[Seed] Notice: No administrator found and ADMIN_PASSWORD environment variable was not provided.\n` +
      `       To initialize an administrator, run with ADMIN_PASSWORD="your-secure-password" npm run db:seed`
    );
  }

  // 2. Seed Default System Settings (Idempotent Singleton)
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
    console.log('[Seed] Default System Settings initialized.');
  } else {
    console.log('[Seed] System Settings already initialized. Skipping.');
  }

  // 3. Seed Default Categories (Idempotent)
  const defaultCategories = [
    'Tablet',
    'Capsule',
    'Syrup',
    'Injection',
    'Drops',
    'Cream',
    'Powder',
    'Medical Device',
    'Surgical Item',
    'Others',
  ];

  let seededCategoryCount = 0;
  for (const name of defaultCategories) {
    const existingCat = await prisma.category.findUnique({ where: { name } });
    if (!existingCat) {
      await prisma.category.create({
        data: { name, status: true },
      });
      seededCategoryCount++;
    }
  }

  if (seededCategoryCount > 0) {
    console.log(`[Seed] Seeded ${seededCategoryCount} standard medicine categories.`);
  } else {
    console.log('[Seed] Standard medicine categories already present. Skipping.');
  }

  console.log('\n=========================================');
  console.log('Database Seeding Completed Safely');
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error('[Seed Error]', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
