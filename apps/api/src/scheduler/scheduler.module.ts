import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service.js';
import { ScheduledTaskProcessor } from './scheduled-task.processor.js';
import { OrchestratorModule } from '../orchestrator/orchestrator.module.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scheduled-scans' }),
    OrchestratorModule,
  ],
  providers: [SchedulerService, ScheduledTaskProcessor],
  exports: [SchedulerService],
})
export class SchedulerModule {}
