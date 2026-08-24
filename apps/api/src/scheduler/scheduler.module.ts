import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { EventModule } from '../event/event.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { IntelligenceModule } from '../intelligence/intelligence.module.js';

@Module({
  imports: [DatabaseModule, EventModule, LLMModule, IntelligenceModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
