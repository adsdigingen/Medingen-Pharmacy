import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ManufacturersModule } from './modules/manufacturers/manufacturers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ProductsModule } from './modules/products/products.module';
import { BatchesModule } from './modules/batches/batches.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PrintModule } from './modules/print/print.module';
import { BillingModule } from './modules/billing/billing.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { UsersManagementModule } from './modules/users-management/users-management.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { LicenseModule } from './modules/license/license.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DrugScheduleRegisterModule } from './modules/drug-schedule-register/drug-schedule-register.module';
import { CounterModule } from './modules/counter/counter.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { DomainModule } from './common/domain/domain.module';
import { ListenersModule } from './common/listeners/listeners.module';
import { WorkersModule } from './modules/workers/workers.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    DomainModule,
    ListenersModule,
    WorkersModule,
    SchedulerModule,
    DiagnosticsModule,
    PrismaModule,
    CategoriesModule,
    ManufacturersModule,
    SuppliersModule,
    ProductsModule,
    BatchesModule,
    InventoryModule,
    PurchaseOrdersModule,
    DashboardModule,
    CustomersModule,
    PrintModule,
    BillingModule,
    AuditLogsModule,
    UsersManagementModule,
    SystemSettingsModule,
    LicenseModule,
    MaintenanceModule,
    ReportsModule,
    DrugScheduleRegisterModule,
    CounterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
