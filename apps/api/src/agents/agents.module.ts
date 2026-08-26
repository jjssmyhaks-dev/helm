import { Module } from '@nestjs/common';
import { WritingAgent } from './writing.agent.js';
import { FinanceAgent } from './finance.agent.js';
import { PerformanceMarketingAgent } from './performance-marketing.agent.js';
import { MetaAdsAgent } from './meta-ads.agent.js';
import { AdCreatorAgent } from './ad-creator.agent.js';
import { GoogleAdsAgent } from './google-ads.agent.js';
import { SeoAgent } from './seo.agent.js';
import { ProjectManagementAgent } from './project-management.agent.js';
import { AgentOrchestratorService } from './agent-orchestrator.service.js';
import { LLMModule } from '../llm/llm.module.js';
import { ConnectorModule } from '../connector/connector.module.js';
import { DatabaseModule } from '../database/database.module.js';

const AGENTS = [
  WritingAgent,
  FinanceAgent,
  PerformanceMarketingAgent,
  MetaAdsAgent,
  AdCreatorAgent,
  GoogleAdsAgent,
  SeoAgent,
  ProjectManagementAgent,
];

@Module({
  imports: [LLMModule, ConnectorModule, DatabaseModule],
  providers: [...AGENTS, AgentOrchestratorService],
  exports: [...AGENTS, AgentOrchestratorService],
})
export class AgentsModule {}
