import { Module } from '@nestjs/common';
import { UsersManagementService } from './users-management.service';
import { UsersManagementController } from './users-management.controller';

@Module({
  controllers: [UsersManagementController],
  providers: [UsersManagementService],
  exports: [UsersManagementService],
})
export class UsersManagementModule {}
