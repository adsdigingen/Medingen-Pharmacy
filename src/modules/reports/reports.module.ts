import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

import { ReportRepository } from './repository/report.repository';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportRepository],
  exports: [ReportsService, ReportRepository],
})
export class ReportsModule {}
