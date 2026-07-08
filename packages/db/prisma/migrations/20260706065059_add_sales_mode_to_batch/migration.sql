-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "manual_price_override" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sales_mode" TEXT NOT NULL DEFAULT 'OFFLINE';

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "manual_price_override" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sales_mode" TEXT NOT NULL DEFAULT 'OFFLINE';
