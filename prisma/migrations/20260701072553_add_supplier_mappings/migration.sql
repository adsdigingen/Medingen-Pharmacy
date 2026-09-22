-- CreateTable
CREATE TABLE "supplier_mappings" (
    "id" UUID NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_mappings_supplier_name_key" ON "supplier_mappings"("supplier_name");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "batches_product_id_status_idx" ON "batches"("product_id", "status");

-- CreateIndex
CREATE INDEX "batches_expiry_date_idx" ON "batches"("expiry_date");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE INDEX "bills_customer_id_idx" ON "bills"("customer_id");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE INDEX "bills_created_at_idx" ON "bills"("created_at");

-- CreateIndex
CREATE INDEX "bills_payment_method_idx" ON "bills"("payment_method");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_manufacturer_id_idx" ON "products"("manufacturer_id");

-- CreateIndex
CREATE INDEX "products_supplier_id_idx" ON "products"("supplier_id");

-- CreateIndex
CREATE INDEX "products_status_deleted_at_idx" ON "products"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_purchase_date_idx" ON "purchase_orders"("purchase_date");

-- CreateIndex
CREATE INDEX "stock_adjustments_batch_id_idx" ON "stock_adjustments"("batch_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_created_at_idx" ON "stock_adjustments"("created_at");

-- CreateIndex
CREATE INDEX "stock_ledgers_product_id_idx" ON "stock_ledgers"("product_id");

-- CreateIndex
CREATE INDEX "stock_ledgers_batch_id_idx" ON "stock_ledgers"("batch_id");

-- CreateIndex
CREATE INDEX "stock_ledgers_transaction_type_idx" ON "stock_ledgers"("transaction_type");

-- CreateIndex
CREATE INDEX "stock_ledgers_timestamp_idx" ON "stock_ledgers"("timestamp");

-- CreateIndex
CREATE INDEX "sync_queues_entity_name_idx" ON "sync_queues"("entity_name");

-- CreateIndex
CREATE INDEX "sync_queues_sync_status_idx" ON "sync_queues"("sync_status");

-- CreateIndex
CREATE INDEX "sync_queues_created_at_idx" ON "sync_queues"("created_at");
