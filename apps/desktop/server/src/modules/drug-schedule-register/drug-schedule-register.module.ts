import { Module } from '@nestjs/common';
import { DrugScheduleRegisterController } from './drug-schedule-register.controller';
import { DrugScheduleRegisterService } from './drug-schedule-register.service';
import { DrugScheduleRegisterRepository } from './repository/drug-schedule-register.repository';

@Module({
  controllers: [DrugScheduleRegisterController],
  providers: [DrugScheduleRegisterService, DrugScheduleRegisterRepository],
})
export class DrugScheduleRegisterModule {}
