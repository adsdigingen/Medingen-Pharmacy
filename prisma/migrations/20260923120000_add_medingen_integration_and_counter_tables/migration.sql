-- AlterTable: Add columns to bills
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "doctor_name" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "external_order_id" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'POS';

-- AlterTable: Add online_selling_price to batches and purchase_order_items if needed
ALTER TABLE "batches" DROP COLUMN IF EXISTS "manual_price_override";
ALTER TABLE "batches" DROP COLUMN IF EXISTS "sales_mode";
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "online_selling_price" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "manual_price_override";
ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "sales_mode";
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "online_selling_price" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- Drop obsolete tables if they exist
DROP TABLE IF EXISTS "device_registrations" CASCADE;
DROP TABLE IF EXISTS "sync_conflicts" CASCADE;
DROP TABLE IF EXISTS "sync_histories" CASCADE;
DROP TABLE IF EXISTS "sync_queues" CASCADE;
DROP TABLE IF EXISTS "sync_settings" CASCADE;

-- CreateTable: drug_schedule_registers
CREATE TABLE IF NOT EXISTS "drug_schedule_registers" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "schedule_type" TEXT NOT NULL,
    "patient_name" TEXT,
    "doctor_name" TEXT,
    "prescription_number" TEXT,
    "batch_number" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "signature_image" TEXT,
    "signature_type" TEXT,
    "printed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_schedule_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: counter_inventories
CREATE TABLE IF NOT EXISTS "counter_inventories" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "units_per_strip" INTEGER NOT NULL,
    "available_units" INTEGER NOT NULL DEFAULT 0,
    "reserved_units" INTEGER NOT NULL DEFAULT 0,
    "minimum_units" INTEGER NOT NULL DEFAULT 0,
    "selling_price" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "counter_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: counter_transfers
CREATE TABLE IF NOT EXISTS "counter_transfers" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "transfer_strips" INTEGER NOT NULL,
    "units_per_strip" INTEGER NOT NULL,
    "transferred_units" INTEGER NOT NULL,
    "selling_price" DOUBLE PRECISION,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "counter_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: counter_sales
CREATE TABLE IF NOT EXISTS "counter_sales" (
    "id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "grand_total" DOUBLE PRECISION NOT NULL,
    "cashier_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "counter_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable: counter_sale_items
CREATE TABLE IF NOT EXISTS "counter_sale_items" (
    "id" UUID NOT NULL,
    "counter_sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selling_price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "gst" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "counter_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: medingen_bill_requests
CREATE TABLE IF NOT EXISTS "medingen_bill_requests" (
    "id" UUID NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "bill_id" UUID,
    "request_id" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "medingen_bill_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: api_keys
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Medingen Platform Key',
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "counter_inventories_product_id_batch_id_key" ON "counter_inventories"("product_id", "batch_id");
CREATE UNIQUE INDEX IF NOT EXISTS "counter_sales_invoice_number_key" ON "counter_sales"("invoice_number");
CREATE INDEX IF NOT EXISTS "medingen_bill_requests_external_order_id_idx" ON "medingen_bill_requests"("external_order_id");
CREATE INDEX IF NOT EXISTS "medingen_bill_requests_status_idx" ON "medingen_bill_requests"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");
CREATE INDEX IF NOT EXISTS "api_keys_status_idx" ON "api_keys"("status");
CREATE INDEX IF NOT EXISTS "bills_external_order_id_idx" ON "bills"("external_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "bills_source_external_order_id_key" ON "bills"("source", "external_order_id");

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_schedule_registers_invoice_id_fkey') THEN
        ALTER TABLE "drug_schedule_registers" ADD CONSTRAINT "drug_schedule_registers_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_schedule_registers_product_id_fkey') THEN
        ALTER TABLE "drug_schedule_registers" ADD CONSTRAINT "drug_schedule_registers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counter_inventories_product_id_fkey') THEN
        ALTER TABLE "counter_inventories" ADD CONSTRAINT "counter_inventories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counter_inventories_batch_id_fkey') THEN
        ALTER TABLE "counter_inventories" ADD CONSTRAINT "counter_inventories_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counter_transfers_product_id_fkey') THEN
        ALTER TABLE "counter_transfers" ADD CONSTRAINT "counter_transfers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counter_transfers_batch_id_fkey') THEN
        ALTER TABLE "counter_transfers" ADD CONSTRAINT "counter_transfers_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counter_sale_items_counter_sale_id_fkey') THEN
        ALTER TABLE "counter_sale_items" ADD CONSTRAINT "counter_sale_items_counter_sale_id_fkey" FOREIGN KEY ("counter_sale_id") REFERENCES "counter_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counter_sale_items_product_id_fkey') THEN
        ALTER TABLE "counter_sale_items" ADD CONSTRAINT "counter_sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counter_sale_items_batch_id_fkey') THEN
        ALTER TABLE "counter_sale_items" ADD CONSTRAINT "counter_sale_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medingen_bill_requests_bill_id_fkey') THEN
        ALTER TABLE "medingen_bill_requests" ADD CONSTRAINT "medingen_bill_requests_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
