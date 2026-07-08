import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('health')
  healthCheck() {
    return this.maintenanceService.healthCheck();
  }

  @Post('optimize')
  optimize() {
    return this.maintenanceService.optimize();
  }

  @Get('backup')
  backup() {
    return this.maintenanceService.backupDatabase();
  }

  @Post('restore')
  restore(@Body() backupObj: any) {
    return this.maintenanceService.restoreDatabase(backupObj);
  }
}
