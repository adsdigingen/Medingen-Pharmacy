import { Module } from '@nestjs/common';
import { MedingenIntegrationController } from './medingen-integration.controller';
import { MedingenSettingsController } from './medingen-settings.controller';
import { MedingenIntegrationService } from './medingen-integration.service';
import { ApiKeyService } from './services/api-key.service';
import { MedingenApiGuard } from './guards/medingen-api.guard';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [BillingModule, PrismaModule, AuditLogsModule],
  controllers: [MedingenIntegrationController, MedingenSettingsController],
  providers: [MedingenIntegrationService, ApiKeyService, MedingenApiGuard],
  exports: [MedingenIntegrationService, ApiKeyService, MedingenApiGuard],
})
export class MedingenIntegrationModule {}
