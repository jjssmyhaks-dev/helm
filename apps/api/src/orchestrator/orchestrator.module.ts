import { Module } from '@nestjs/common';
import { GlobalOrchestratorService } from './global-orchestrator.service.js';
import { LayerOrchestratorService } from './layer-orchestrator.service.js';
import { AgentTaskService } from './agent-task.service.js';
import { ApprovalModule } from '../approval/approval.module.js';
import { ContextModule } from '../context/context.module.js';
import { ConnectorModule } from '../connector/connector.module.js';

@Module({
  imports: [ApprovalModule, ContextModule, ConnectorModule],
  providers: [GlobalOrchestratorService, LayerOrchestratorService, AgentTaskService],
  exports: [GlobalOrchestratorService, LayerOrchestratorService, AgentTaskService],
})
export class OrchestratorModule {}
