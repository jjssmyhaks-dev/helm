import { Module } from '@nestjs/common';
import { AutonomyService } from './autonomy.service.js';
import { AutonomyController } from './autonomy.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AutonomyController],
  providers: [AutonomyService],
  exports: [AutonomyService],
})
export class AutonomyModule {}
