import { Module, Global } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';

import { AuditRepository } from './repository/audit.repository';

@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditRepository],
  exports: [AuditLogsService, AuditRepository],
})
export class AuditLogsModule {}
