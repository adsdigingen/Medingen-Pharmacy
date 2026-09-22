import { Module } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsController } from './system-settings.controller';

import { SettingsRepository } from './repository/settings.repository';

@Module({
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService, SettingsRepository],
  exports: [SystemSettingsService, SettingsRepository],
})
export class SystemSettingsModule {}
