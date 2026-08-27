import { Module } from '@nestjs/common';
import { MarketingCampaignEngine } from './marketing-campaign.engine.js';
import { CashflowAnalysisEngine } from './cashflow-analysis.engine.js';
import { CompetitorIntelligenceEngine } from './competitor-intelligence.engine.js';
import { SupportTriageEngine } from './support-triage.engine.js';
import { SerpAPIService } from './serpapi.service.js';
import { IntelligenceController } from './intelligence.controller.js';
import { LLMModule } from '../llm/llm.module.js';

@Module({
  imports: [LLMModule],
  controllers: [IntelligenceController],
  providers: [
    MarketingCampaignEngine,
    CashflowAnalysisEngine,
    CompetitorIntelligenceEngine,
    SupportTriageEngine,
    SerpAPIService,
  ],
  exports: [
    MarketingCampaignEngine,
    CashflowAnalysisEngine,
    CompetitorIntelligenceEngine,
    SupportTriageEngine,
    SerpAPIService,
  ],
})
export class IntelligenceModule {}
