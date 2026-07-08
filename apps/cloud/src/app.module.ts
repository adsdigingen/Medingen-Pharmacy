import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { CloudSyncModule } from './modules/sync/cloud-sync.module';

@Module({
  imports: [PrismaModule, CloudSyncModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
