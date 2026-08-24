import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { ActivitySSEService } from './activity-sse.service.js';
import { ActivityController } from './activity.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ActivityController],
  providers: [ActivityService, ActivitySSEService],
  exports: [ActivityService, ActivitySSEService],
})
export class ActivityModule {}
