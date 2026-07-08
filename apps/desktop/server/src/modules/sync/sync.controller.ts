import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STORE_MANAGER)
@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  getStatus() {
    return this.syncService.getSyncStatus();
  }

  @Post('force')
  forceSync() {
    return this.syncService.forceTrigger();
  }

  @Get('conflicts')
  getConflicts() {
    return this.prisma.syncConflict.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('conflicts/:id/resolve')
  resolveConflict(
    @Param('id') id: string,
    @Body('resolution') resolution: 'LOCAL_WINS' | 'CLOUD_WINS',
  ) {
    return this.syncService.resolveConflict(id, resolution);
  }
}
