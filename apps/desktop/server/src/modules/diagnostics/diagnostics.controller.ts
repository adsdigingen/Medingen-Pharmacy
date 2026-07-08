import { Controller, Get, UseGuards } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private readonly service: DiagnosticsService) {}

  @Get('health')
  getHealth() {
    return this.service.getHealth();
  }

  @Get('status')
  getStatus() {
    return this.service.getStatus();
  }
}
