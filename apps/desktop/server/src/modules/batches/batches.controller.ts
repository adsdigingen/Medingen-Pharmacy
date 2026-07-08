import { Controller, Get, Body, Put, Param, Query, UseGuards } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  findAll(
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.batchesService.findAll({
      productId,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('fefo/:productId')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST, Role.CASHIER)
  findFefo(@Param('productId') productId: string) {
    return this.batchesService.findFefoBatches(productId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  update(@Param('id') id: string, @Body() updateBatchDto: UpdateBatchDto) {
    return this.batchesService.update(id, updateBatchDto);
  }
}
