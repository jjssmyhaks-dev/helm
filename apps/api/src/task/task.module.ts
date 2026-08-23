import { Module } from '@nestjs/common';
import { TaskService } from './task.service.js';
import { TaskController } from './task.controller.js';
import { OrchestratorModule } from '../orchestrator/orchestrator.module.js';

@Module({
  imports: [OrchestratorModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
