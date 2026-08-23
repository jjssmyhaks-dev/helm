import { Module } from '@nestjs/common';
import { GlobalOrchestratorService } from './global-orchestrator.service.js';
import { LayerOrchestratorService } from './layer-orchestrator.service.js';
import { AgentTaskService } from './agent-task.service.js';

@Module({
  providers: [GlobalOrchestratorService, LayerOrchestratorService, AgentTaskService],
  exports: [GlobalOrchestratorService, LayerOrchestratorService, AgentTaskService],
})
export class OrchestratorModule {}
