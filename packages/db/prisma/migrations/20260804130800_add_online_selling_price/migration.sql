-- AlterTable
ALTER TABLE "batches" ADD COLUMN "online_selling_price" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN "online_selling_price" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
