import { Controller, Get, Post, Body, Put, Param, Delete, Query, Patch, UseGuards } from '@nestjs/common';
import { ManufacturersService } from './manufacturers.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Controller('manufacturers')
export class ManufacturersController {
  constructor(private readonly manufacturersService: ManufacturersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  create(@Body() createManufacturerDto: CreateManufacturerDto) {
    return this.manufacturersService.create(createManufacturerDto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.manufacturersService.findAll({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.manufacturersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  update(@Param('id') id: string, @Body() updateManufacturerDto: UpdateManufacturerDto) {
    return this.manufacturersService.update(id, updateManufacturerDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  remove(@Param('id') id: string) {
    return this.manufacturersService.remove(id);
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  toggleStatus(@Param('id') id: string) {
    return this.manufacturersService.toggleStatus(id);
  }
}
