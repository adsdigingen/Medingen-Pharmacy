"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
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
    }
    else {
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
            },
        });
        console.log('✓ Default System Settings Created');
    }
    else {
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
    }
    else {
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
