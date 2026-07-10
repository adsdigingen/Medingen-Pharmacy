-- AlterTable
ALTER TABLE "products" ADD COLUMN     "drug_schedule" TEXT,
ADD COLUMN     "medicine_classification" TEXT,
ADD COLUMN     "prescription_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cold_chain_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "controlled_drug" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "high_value_medicine" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storage_condition" TEXT;
