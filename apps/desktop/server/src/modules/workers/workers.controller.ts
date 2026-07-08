import { Controller, Get, Post, Param, Body, NotFoundException, UseGuards } from '@nestjs/common';
import { WorkerRegistry } from './worker-registry';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('workers')
export class WorkersController {
  constructor(private readonly registry: WorkerRegistry) {}

  @Get('status')
  getStatus() {
    const workers = this.registry.getAllWorkers();
    return workers.map(w => ({
      name: w.name,
      enabled: w.enabled,
      isExecuting: w.isExecuting,
      lastExecutedAt: w.lastExecutedAt,
      lastExecutionDurationMs: w.lastExecutionDurationMs,
      lastError: w.lastError,
    }));
  }

  @Post(':name/trigger')
  async triggerWorker(@Param('name') name: string) {
    const worker = this.registry.getWorker(name);
    if (!worker) {
      throw new NotFoundException(`Worker with name "${name}" not found.`);
    }
    await worker.execute();
    return {
      message: `Worker "${worker.name}" execution triggered.`,
      status: {
        isExecuting: worker.isExecuting,
        lastExecutedAt: worker.lastExecutedAt,
        lastExecutionDurationMs: worker.lastExecutionDurationMs,
        lastError: worker.lastError,
      },
    };
  }

  @Post(':name/toggle')
  toggleWorker(@Param('name') name: string, @Body() body: { enabled: boolean }) {
    const worker = this.registry.getWorker(name);
    if (!worker) {
      throw new NotFoundException(`Worker with name "${name}" not found.`);
    }
    worker.toggle(body.enabled);
    return {
      name: worker.name,
      enabled: worker.enabled,
    };
  }
}
