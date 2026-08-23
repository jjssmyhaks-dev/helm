import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

/**
 * Auth service — lightweight service for verifying users exist in the DB.
 * Actual authentication is handled by Clerk on the frontend.
 * This service syncs Clerk users to our database.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Ensure a Clerk user exists in our database.
   * Called when a user first signs in via Clerk.
   */
  async syncUser(clerkUser: {
    id: string;
    email: string;
    name?: string;
  }) {
    let founder = await this.prisma.founder.findUnique({
      where: { id: clerkUser.id },
    });

    if (!founder) {
      founder = await this.prisma.founder.create({
        data: {
          id: clerkUser.id,
          email: clerkUser.email,
          passwordHash: 'clerk-managed',
          name: clerkUser.name || clerkUser.email.split('@')[0],
          businessName: '',
        },
      });

      // Seed default agents
      await this.seedDefaultAgents(founder.id);
      this.logger.log(`Created founder: ${founder.id}`);
    }

    return founder;
  }

  async getFounder(clerkUserId: string) {
    return this.prisma.founder.findUnique({
      where: { id: clerkUserId },
    });
  }

  /**
   * Seed the standard 26 agents for a new founder.
   */
  private async seedDefaultAgents(founderId: string) {
    const agentDefinitions = [
      { name: 'Global Orchestrator', description: 'Owns founder goals, context, and overall state.', type: 'GLOBAL_ORCHestrator' as const, layer: null },
      { name: 'Research Orchestrator', description: 'Decomposes research tasks.', type: 'LAYER_ORCHESTRATOR' as const, layer: 'RESEARCH' as const },
      { name: 'Competitor Intelligence', description: 'Tracks named competitors.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Market & Trend Scanning', description: 'Continuous scan of industry news.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Pricing & Benchmarking', description: 'Category pricing benchmarks.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Customer & Audience Research', description: 'Persona research, sentiment analysis.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Campaign Deep-Dive', description: 'On-demand research from Marketing.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Marketing Orchestrator', description: 'Decomposes marketing tasks.', type: 'LAYER_ORCHESTRATOR' as const, layer: 'MARKETING' as const },
      { name: 'Digital Marketing Strategist', description: 'Channel strategy, campaign planning.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Performance Marketer', description: 'Paid ads, conversion tracking.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Content & Copywriter', description: 'Blog, email, ad copy.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'SEO Specialist', description: 'Keyword research, on-page SEO.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Designer', description: 'Creative assets via Figma/Canva.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Social & Community', description: 'Organic social posting.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Operations Orchestrator', description: 'Decomposes operations tasks.', type: 'LAYER_ORCHESTRATOR' as const, layer: 'OPERATIONS' as const },
      { name: 'Process & Workflow', description: 'Internal SOPs, automation.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Vendor & Supply Chain', description: 'Vendor communication, order tracking.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Quality & Fulfillment', description: 'Order/delivery quality checks.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Customer Support', description: 'Tier-1 support triage.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Scheduling & Capacity Planning', description: 'Resource forecasting.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Finance Orchestrator', description: 'Decomposes finance tasks.', type: 'LAYER_ORCHESTRATOR' as const, layer: 'FINANCE' as const },
      { name: 'Bookkeeping', description: 'Transaction categorization.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
      { name: 'Cash Flow & Forecasting', description: 'Cash position, runway forecasting.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
      { name: 'Pricing & Unit Economics', description: 'Margin analysis, pricing.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
      { name: 'Compliance & Tax', description: 'Filing calendar, GST/tax tracking.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
      { name: 'Fundraising & Investor Relations', description: 'Cap table, investor updates.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
    ];

    await this.prisma.agent.createMany({
      data: agentDefinitions.map((def) => ({
        ...def,
        founderId,
      })),
    });
  }
}
