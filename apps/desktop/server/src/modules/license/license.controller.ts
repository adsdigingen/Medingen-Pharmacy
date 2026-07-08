import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { LicenseService } from './license.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get()
  getLicense() {
    return this.licenseService.getLicense();
  }

  @Post('activate')
  activate(@Body('licenseKey') licenseKey: string) {
    return this.licenseService.activate(licenseKey);
  }
}
