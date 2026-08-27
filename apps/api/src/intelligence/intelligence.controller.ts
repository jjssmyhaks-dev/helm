import { Controller, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketingCampaignEngine } from './marketing-campaign.engine.js';
import { CashflowAnalysisEngine } from './cashflow-analysis.engine.js';
import { CompetitorIntelligenceEngine } from './competitor-intelligence.engine.js';
import { SupportTriageEngine } from './support-triage.engine.js';

@ApiTags('Intelligence')
@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private marketing: MarketingCampaignEngine,
    private cashflow: CashflowAnalysisEngine,
    private competitor: CompetitorIntelligenceEngine,
    private support: SupportTriageEngine,
  ) {}

  // ─── Marketing ────────────────────────────────────────────

  @Post('marketing/campaign-plan')
  @ApiOperation({ summary: 'Create a marketing campaign plan' })
  async createCampaignPlan(
    @Body() body: {
      founderId: string;
      product: string;
      targetAudience: string;
      budget: number;
      goals: string[];
      competitors?: string[];
      preferredChannels?: string[];
    },
  ) {
    return this.marketing.createCampaignPlan(body.founderId, body);
  }

  @Post('marketing/analyze-campaign')
  @ApiOperation({ summary: 'Analyze campaign performance' })
  async analyzeCampaign(
    @Body() body: {
      founderId: string;
      campaignData: any;
    },
  ) {
    return this.marketing.analyzeCampaign(body.founderId, body.campaignData);
  }

  @Post('marketing/ab-test')
  @ApiOperation({ summary: 'Generate A/B test variants' })
  async generateABTest(
    @Body() body: {
      type: 'ad_copy' | 'landing_page' | 'email_subject' | 'social_post';
      product: string;
      audience: string;
      goal: string;
      currentVersion?: string;
    },
  ) {
    return this.marketing.generateABTestVariants(body.type, body);
  }

  @Post('marketing/optimize-budget')
  @ApiOperation({ summary: 'Optimize budget allocation across channels' })
  async optimizeBudget(
    @Body() body: {
      totalBudget: number;
      historicalPerformance?: Record<string, any>;
      constraints?: any;
    },
  ) {
    return this.marketing.optimizeBudgetAllocation(body.totalBudget, body.historicalPerformance, body.constraints);
  }

  // ─── Cashflow ────────────────────────────────────────────

  @Post('cashflow/analyze')
  @ApiOperation({ summary: 'Analyze cashflow from transactions' })
  async analyzeCashflow(
    @Body() body: {
      founderId: string;
      transactions: { date: string; description: string; amount: number; type: 'income' | 'expense' }[];
      currentBalance: number;
      businessType?: string;
    },
  ) {
    return this.cashflow.analyzeCashflow(body.founderId, body.transactions, body.currentBalance, body.businessType);
  }

  @Post('cashflow/unit-economics')
  @ApiOperation({ summary: 'Calculate SaaS unit economics' })
  async calculateUnitEconomics(
    @Body() body: {
      founderId: string;
      data: any;
    },
  ) {
    return this.cashflow.calculateUnitEconomics(body.founderId, body.data);
  }

  // ─── Competitor Intelligence ─────────────────────────────

  @Post('competitor/profile')
  @ApiOperation({ summary: 'Build a competitor profile' })
  async profileCompetitor(
    @Body() body: {
      founderId: string;
      name: string;
      industry: string;
    },
  ) {
    return this.competitor.profileCompetitor(body.founderId, body.name, body.industry);
  }

  @Post('competitor/market-analysis')
  @ApiOperation({ summary: 'Analyze the market landscape' })
  async analyzeMarket(
    @Body() body: {
      founderId: string;
      industry: string;
      product: string;
    },
  ) {
    return this.competitor.analyzeMarket(body.founderId, body.industry, body.product);
  }

  @Post('competitor/pricing-benchmark')
  @ApiOperation({ summary: 'Benchmark pricing against competitors' })
  async benchmarkPricing(
    @Body() body: {
      founderId: string;
      product: string;
      industry: string;
      currentPrice?: number;
    },
  ) {
    return this.competitor.benchmarkPricing(body.founderId, body.product, body.industry, body.currentPrice);
  }

  @Post('competitor/weekly-digest')
  @ApiOperation({ summary: 'Generate a weekly competitive digest' })
  async weeklyDigest(
    @Body() body: {
      founderId: string;
      competitors: string[];
      industry: string;
    },
  ) {
    return this.competitor.generateCompetitiveDigest(body.founderId, body.competitors, body.industry);
  }

  // ─── Customer Support ────────────────────────────────────

  @Post('support/triage')
  @ApiOperation({ summary: 'Triage a support ticket' })
  async triageTicket(
    @Body() body: {
      founderId: string;
      ticket: { id: string; subject: string; body: string; channel: string; customerName?: string };
      faqs?: { question: string; answer: string }[];
    },
  ) {
    return this.support.triageTicket(body.founderId, body.ticket, body.faqs);
  }

  @Post('support/auto-respond')
  @ApiOperation({ summary: 'Auto-respond to a support message' })
  async autoRespond(
    @Body() body: {
      founderId: string;
      message: string;
      channel: string;
      faqs?: { question: string; answer: string }[];
    },
  ) {
    return this.support.autoRespond(body.founderId, body.message, body.channel, body.faqs || []);
  }

  @Post('support/insights')
  @ApiOperation({ summary: 'Generate support insights from ticket history' })
  async supportInsights(
    @Body() body: {
      founderId: string;
      tickets: any[];
    },
  ) {
    return this.support.generateInsights(body.founderId, body.tickets);
  }
}
