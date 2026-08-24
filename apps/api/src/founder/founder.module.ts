import { Module } from '@nestjs/common';
import { FounderService } from './founder.service.js';
import { SettingsService } from './settings.service.js';
import { FounderController } from './founder.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [FounderController],
  providers: [FounderService, SettingsService],
  exports: [FounderService, SettingsService],
})
export class FounderModule {}
