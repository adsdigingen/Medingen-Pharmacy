import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';

import { SupplierRepository } from './repository/supplier.repository';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SupplierRepository],
  exports: [SuppliersService, SupplierRepository],
})
export class SuppliersModule {}
