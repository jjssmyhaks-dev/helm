import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LLMService } from '../llm/llm.service.js';

export interface CompetitorProfile {
  name: string;
  website: string;
  positioning: string;
  targetAudience: string;
  pricingModel: string;
  estimatedRevenue: string;
  strengths: string[];
  weaknesses: string[];
  recentActivity: CompetitorEvent[];
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CompetitorEvent {
  date: string;
  type: 'product_launch' | 'pricing_change' | 'funding' | 'hiring' | 'partnership' | 'marketing' | 'other';
  summary: string;
  impact: string;
}

export interface MarketAnalysis {
  marketSize: string;
  growthRate: string;
  trends: MarketTrend[];
  opportunities: string[];
  threats: string[];
  competitiveLandscape: string;
  positioningRecommendation: string;
}

export interface MarketTrend {
  trend: string;
  direction: 'growing' | 'stable' | 'declining';
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  recommendation: string;
}

export interface PricingBenchmark {
  category: string;
  competitors: { name: string; price: string; model: string }[];
  marketAverage: string;
  position: string;
  recommendation: string;
}

@Injectable()
export class CompetitorIntelligenceEngine {
  private readonly logger = new Logger(CompetitorIntelligenceEngine.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
  ) {}

  /**
   * Build a detailed competitor profile using web research.
   */
  async profileCompetitor(
    founderId: string,
    competitorName: string,
    industry: string,
  ): Promise<CompetitorProfile> {
    this.logger.log(`Building competitor profile: ${competitorName}`);

    const context = await this.prisma.founderContext.findUnique({
      where: { founderId },
    });

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a competitive intelligence analyst. Build a detailed profile of a competitor.

Output valid JSON:
{
  "name": "Competitor name",
  "website": "URL",
  "positioning": "How they position themselves",
  "targetAudience": "Who they target",
  "pricingModel": "Their pricing approach",
  "estimatedRevenue": "Estimate if possible",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recentActivity": [{"date": "YYYY-MM", "type": "product_launch|pricing_change|funding|hiring|partnership|marketing|other", "summary": "...", "impact": "..."}],
  "threatLevel": "low|medium|high|critical"
}

Be analytical and specific. Consider the Indian market context.`,
      },
      {
        role: 'user',
        content: `Build a competitor profile:

Competitor: ${competitorName}
Industry: ${industry}
${context ? `Our positioning: ${JSON.stringify(context.goals)}` : ''}

Use your knowledge of the Indian startup ecosystem. Be specific about pricing, features, and market positioning.`,
      },
    ], { maxTokens: 3072, temperature: 0.3 });

    try {
      return JSON.parse(response.content) as CompetitorProfile;
    } catch {
      return {
        name: competitorName,
        website: '',
        positioning: response.content,
        targetAudience: '',
        pricingModel: '',
        estimatedRevenue: '',
        strengths: [],
        weaknesses: [],
        recentActivity: [],
        threatLevel: 'medium',
      };
    }
  }

  /**
   * Analyze the overall market landscape.
   */
  async analyzeMarket(
    founderId: string,
    industry: string,
    product: string,
  ): Promise<MarketAnalysis> {
    this.logger.log(`Analyzing market: ${industry}`);

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a market research analyst specializing in the Indian startup ecosystem. Analyze the market landscape.

Output valid JSON:
{
  "marketSize": "Estimated market size",
  "growthRate": "Annual growth rate",
  "trends": [{"trend": "...", "direction": "growing|stable|declining", "impact": "high|medium|low", "timeframe": "...", "recommendation": "..."}],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "threats": ["threat 1", "threat 2"],
  "competitiveLandscape": "Overview of competition",
  "positioningRecommendation": "How to differentiate"
}

Be specific about the Indian market. Include regulatory considerations.`,
      },
      {
        role: 'user',
        content: `Analyze the market for:
Industry: ${industry}
Product/Service: ${product}

Consider: Indian market size, growth trends, regulatory environment (RBI, SEBI, DPDP Act), payment infrastructure (UPI), and competitive dynamics.`,
      },
    ], { maxTokens: 3072, temperature: 0.4 });

    try {
      return JSON.parse(response.content) as MarketAnalysis;
    } catch {
      return {
        marketSize: '',
        growthRate: '',
        trends: [],
        opportunities: [],
        threats: [],
        competitiveLandscape: response.content,
        positioningRecommendation: '',
      };
    }
  }

  /**
   * Benchmark pricing against competitors.
   */
  async benchmarkPricing(
    founderId: string,
    product: string,
    industry: string,
    currentPrice?: number,
  ): Promise<PricingBenchmark> {
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a pricing strategy expert for Indian startups. Benchmark pricing against competitors.

Output valid JSON:
{
  "category": "Product category",
  "competitors": [{"name": "...", "price": "₹X/month", "model": "subscription|one-time|freemium|usage-based"}],
  "marketAverage": "₹X/month",
  "position": "Where the founder's price sits (premium/average/budget)",
  "recommendation": "Pricing strategy recommendation"
}`,
      },
      {
        role: 'user',
        content: `Benchmark pricing for:
Product: ${product}
Industry: ${industry}
${currentPrice ? `Current Price: ₹${currentPrice}/month` : 'No pricing set yet'}

Consider Indian market willingness to pay, competitor pricing, and value-based pricing strategies.`,
      },
    ], { maxTokens: 2048, temperature: 0.3 });

    try {
      return JSON.parse(response.content) as PricingBenchmark;
    } catch {
      return {
        category: product,
        competitors: [],
        marketAverage: '',
        position: '',
        recommendation: response.content,
      };
    }
  }

  /**
   * Generate a weekly competitive digest — a summary of what competitors did this week.
   */
  async generateCompetitiveDigest(
    founderId: string,
    competitors: string[],
    industry: string,
  ): Promise<{ digest: string; keyTakeaways: string[]; actionItems: string[] }> {
    const context = await this.prisma.founderContext.findUnique({
      where: { founderId },
    });

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a competitive intelligence analyst. Generate a weekly competitive digest for the founder.

Output valid JSON:
{
  "digest": "A 2-3 paragraph executive summary of what happened in the competitive landscape this week",
  "keyTakeaways": ["takeaway 1", "takeaway 2"],
  "actionItems": ["action 1", "action 2"]
}

Write in a concise, founder-friendly tone. Highlight what matters and what to ignore.`,
      },
      {
        role: 'user',
        content: `Generate competitive digest for:

Industry: ${industry}
Competitors to track: ${competitors.join(', ')}
${context ? `Our business context: ${JSON.stringify(context.goals)}` : ''}

Based on recent industry news, product updates, and market movements. Focus on actionable insights.`,
      },
    ], { maxTokens: 2048, temperature: 0.5 });

    try {
      return JSON.parse(response.content);
    } catch {
      return { digest: response.content, keyTakeaways: [], actionItems: [] };
    }
  }
}
