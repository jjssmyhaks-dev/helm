import { Module } from '@nestjs/common';
import { ComposioService } from './composio.service.js';
import { AgentToolConnectorService } from './agent-tool-connector.service.js';
import { ConnectorController } from './connector.controller.js';
import { LLMModule } from '../llm/llm.module.js';

@Module({
  imports: [LLMModule],
  controllers: [ConnectorController],
  providers: [ComposioService, AgentToolConnectorService],
  exports: [ComposioService, AgentToolConnectorService],
})
export class ConnectorModule {}
