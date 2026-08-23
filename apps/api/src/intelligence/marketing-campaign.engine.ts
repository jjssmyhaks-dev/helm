import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LLMService } from '../llm/llm.service.js';

export interface CampaignPlan {
  name: string;
  objective: string;
  channels: ChannelPlan[];
  budget: BudgetAllocation;
  timeline: TimelinePhase[];
  kpis: KPI[];
  riskAssessment: string;
}

export interface ChannelPlan {
  channel: string;
  budget: number;
  contentStrategy: string;
  targetAudience: string;
  frequency: string;
  estimatedReach: number;
  estimatedCPC: number;
}

export interface BudgetAllocation {
  totalBudget: number;
  byChannel: Record<string, number>;
  expectedROI: number;
  contingencyPercent: number;
}

export interface TimelinePhase {
  phase: string;
  startDate: string;
  endDate: string;
  activities: string[];
  milestone: string;
}

export interface KPI {
  metric: string;
  target: number;
  unit: string;
  trackingMethod: string;
}

export interface CampaignAnalysis {
  campaignId: string;
  performance: PerformanceMetrics;
  insights: string[];
  optimizations: Optimization[];
  competitorComparison: string;
  nextActions: string[];
}

export interface PerformanceMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  cpc: number;
  cpa: number;
  roas: number;
  ctr: number;
}

export interface Optimization {
  area: string;
  current: string;
  recommended: string;
  expectedImpact: string;
  urgency: 'low' | 'medium' | 'high';
}

@Injectable()
export class MarketingCampaignEngine {
  private readonly logger = new Logger(MarketingCampaignEngine.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
  ) {}

  /**
   * Create a comprehensive marketing campaign plan for a founder's startup.
   */
  async createCampaignPlan(
    founderId: string,
    brief: {
      product: string;
      targetAudience: string;
      budget: number;
      goals: string[];
      competitors?: string[];
      preferredChannels?: string[];
    },
  ): Promise<CampaignPlan> {
    this.logger.log(`Creating campaign plan for founder ${founderId}`);

    // Load founder context for personalized recommendations
    const context = await this.prisma.founderContext.findUnique({
      where: { founderId },
    });

    const founderContext = context ? JSON.stringify(context.goals) : 'No context available';

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a world-class digital marketing strategist. Create a detailed, actionable marketing campaign plan for an early-stage startup.

Output MUST be valid JSON matching this structure:
{
  "name": "Campaign name",
  "objective": "Primary objective",
  "channels": [{"channel": "name", "budget": 0, "contentStrategy": "...", "targetAudience": "...", "frequency": "...", "estimatedReach": 0, "estimatedCPC": 0}],
  "budget": {"totalBudget": 0, "byChannel": {}, "expectedROI": 0, "contingencyPercent": 10},
  "timeline": [{"phase": "...", "startDate": "...", "endDate": "...", "activities": [], "milestone": "..."}],
  "kpis": [{"metric": "...", "target": 0, "unit": "...", "trackingMethod": "..."}],
  "riskAssessment": "..."
}

Be specific with numbers. For Indian market, use INR. For international, use USD.`,
      },
      {
        role: 'user',
        content: `Create a marketing campaign plan:

Product/Service: ${brief.product}
Target Audience: ${brief.targetAudience}
Budget: ₹${brief.budget.toLocaleString('en-IN')}
Goals: ${brief.goals.join(', ')}
${brief.competitors?.length ? `Competitors: ${brief.competitors.join(', ')}` : ''}
${brief.preferredChannels?.length ? `Preferred Channels: ${brief.preferredChannels.join(', ')}` : ''}
${brief.preferredChannels?.length ? '' : 'Suggest the best channels for this budget and audience.'}

Founder Business Context: ${founderContext}`,
      },
    ], { maxTokens: 4096, temperature: 0.7 });

    try {
      const plan = JSON.parse(response.content) as CampaignPlan;
      
      // Log the plan creation
      await this.prisma.activityLogEntry.create({
        data: {
          founderId,
          agentId: '',
          action: 'campaign_plan_created',
          details: { plan: plan.name, budget: plan.budget.totalBudget, channels: plan.channels.map(c => c.channel) } as any,
          riskTier: 'AUTO_EXECUTE',
        },
      });

      return plan;
    } catch {
      this.logger.warn('Failed to parse campaign plan JSON, returning raw');
      return {
        name: 'Marketing Campaign',
        objective: brief.goals[0] || 'Awareness',
        channels: [],
        budget: { totalBudget: brief.budget, byChannel: {}, expectedROI: 0, contingencyPercent: 10 },
        timeline: [],
        kpis: [],
        riskAssessment: response.content,
      };
    }
  }

  /**
   * Analyze campaign performance and suggest optimizations.
   */
  async analyzeCampaign(
    founderId: string,
    campaignData: {
      name: string;
      metrics: PerformanceMetrics;
      duration: string;
      channelBreakdown?: Record<string, PerformanceMetrics>;
    },
  ): Promise<CampaignAnalysis> {
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a performance marketing analyst. Analyze campaign data and provide actionable insights.

Output MUST be valid JSON:
{
  "performance": {"impressions": 0, "clicks": 0, "conversions": 0, "spend": 0, "cpc": 0, "cpa": 0, "roas": 0, "ctr": 0},
  "insights": ["insight 1", "insight 2"],
  "optimizations": [{"area": "...", "current": "...", "recommended": "...", "expectedImpact": "...", "urgency": "high|medium|low"}],
  "competitorComparison": "...",
  "nextActions": ["action 1", "action 2"]
}`,
      },
      {
        role: 'user',
        content: `Analyze this campaign:

Campaign: ${campaignData.name}
Duration: ${campaignData.duration}
Total Spend: ₹${campaignData.metrics.spend}
Impressions: ${campaignData.metrics.impressions}
Clicks: ${campaignData.metrics.clicks}
Conversions: ${campaignData.metrics.conversions}
CPC: ₹${campaignData.metrics.cpc.toFixed(2)}
CPA: ₹${campaignData.metrics.cpa.toFixed(2)}
ROAS: ${campaignData.metrics.roas}x
CTR: ${(campaignData.metrics.ctr * 100).toFixed(2)}%
${campaignData.channelBreakdown ? `Channel Breakdown: ${JSON.stringify(campaignData.channelBreakdown)}` : ''}`,
      },
    ], { maxTokens: 2048, temperature: 0.5 });

    try {
      return {
        campaignId: `campaign_${Date.now()}`,
        ...JSON.parse(response.content),
      };
    } catch {
      return {
        campaignId: `campaign_${Date.now()}`,
        performance: campaignData.metrics,
        insights: [response.content],
        optimizations: [],
        competitorComparison: '',
        nextActions: [],
      };
    }
  }

  /**
   * Generate A/B test variants for ad copy, landing pages, or email subject lines.
   */
  async generateABTestVariants(
    type: 'ad_copy' | 'landing_page' | 'email_subject' | 'social_post',
    context: {
      product: string;
      audience: string;
      goal: string;
      currentVersion?: string;
    },
  ): Promise<{ variants: { name: string; content: string; hypothesis: string }[]; testPlan: string }> {
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `Generate A/B test variants. Output valid JSON:
{
  "variants": [{"name": "Variant A", "content": "...", "hypothesis": "..."}],
  "testPlan": "How to run this test, sample size needed, duration, success criteria"
}
Generate 3 variants (including the original if provided). Each must test a different psychological lever.`,
      },
      {
        role: 'user',
        content: `Generate A/B test variants for:
Type: ${type}
Product: ${context.product}
Audience: ${context.audience}
Goal: ${context.goal}
${context.currentVersion ? `Current Version: ${context.currentVersion}` : 'No existing version — create from scratch.'}`,
      },
    ], { maxTokens: 2048, temperature: 0.8 });

    try {
      return JSON.parse(response.content);
    } catch {
      return { variants: [], testPlan: response.content };
    }
  }

  /**
   * Calculate optimal budget allocation across channels.
   */
  async optimizeBudgetAllocation(
    totalBudget: number,
    historicalPerformance?: Record<string, { spend: number; conversions: number; revenue: number }>,
    constraints?: { minPerChannel?: number; maxPerChannel?: number; requiredChannels?: string[] },
  ): Promise<{ allocation: Record<string, number>; reasoning: string; expectedOutcome: string }> {
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a budget optimization expert. Allocate marketing budget across channels for maximum ROI.
Output valid JSON:
{
  "allocation": {"channel_name": budget_amount},
  "reasoning": "Why this allocation",
  "expectedOutcome": "What results to expect"
}`,
      },
      {
        role: 'user',
        content: `Optimize budget allocation:
Total Budget: ₹${totalBudget.toLocaleString('en-IN')}
${historicalPerformance ? `Historical Performance: ${JSON.stringify(historicalPerformance)}` : 'No historical data — use industry benchmarks for Indian startups.'}
${constraints ? `Constraints: ${JSON.stringify(constraints)}` : 'No specific constraints.'}`,
      },
    ], { maxTokens: 2048, temperature: 0.5 });

    try {
      return JSON.parse(response.content);
    } catch {
      return { allocation: {}, reasoning: response.content, expectedOutcome: '' };
    }
  }
}
