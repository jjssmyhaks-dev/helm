import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

/**
 * Clerk-compatible auth guard.
 * 
 * The frontend sends the Clerk user ID as x-founder-id header.
 * This guard extracts it, auto-creates the Founder record if needed,
 * and attaches the founder to the request.
 */
@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const founderId = request.headers['x-founder-id'];

    if (!founderId || typeof founderId !== 'string') {
      throw new UnauthorizedException('Missing x-founder-id header');
    }

    // Check if founder exists, create if not (auto-provision on first login)
    let founder = await this.prisma.founder.findUnique({
      where: { clerkUserId: founderId },
    });

    if (!founder) {
      // Auto-create founder from Clerk user ID
      founder = await this.prisma.founder.create({
        data: {
          id: crypto.randomUUID(),
          clerkUserId: founderId,
          email: `${founderId}@clerk.user`,
          name: 'Founder',
        },
      });

      // Seed default agents
      await this.seedDefaultAgents(founder.id);
    }

    // Attach founder to request
    request.user = { id: founder.id, founderId: founder.id, clerkUserId: founderId };
    return true;
  }

  private async seedDefaultAgents(founderId: string) {
    const agents = [
      { name: 'Global Orchestrator', description: 'Owns founder goals and routing.', role: 'orchestrator', layer: 'RESEARCH' as any },
      { name: 'Research Orchestrator', description: 'Decomposes research tasks.', role: 'orchestrator', layer: 'RESEARCH' as any },
      { name: 'Competitor Intelligence', description: 'Tracks named competitors.', role: 'specialist', layer: 'RESEARCH' as any },
      { name: 'Market & Trend Scanning', description: 'Industry news and trends.', role: 'specialist', layer: 'RESEARCH' as any },
      { name: 'Pricing & Benchmarking', description: 'Category pricing benchmarks.', role: 'specialist', layer: 'RESEARCH' as any },
      { name: 'Customer & Audience Research', description: 'Persona research, sentiment.', role: 'specialist', layer: 'RESEARCH' as any },
      { name: 'Campaign Deep-Dive', description: 'On-demand research.', role: 'specialist', layer: 'RESEARCH' as any },
      { name: 'Marketing Orchestrator', description: 'Decomposes marketing tasks.', role: 'orchestrator', layer: 'MARKETING' as any },
      { name: 'Digital Marketing Strategist', description: 'Channel strategy.', role: 'specialist', layer: 'MARKETING' as any },
      { name: 'Performance Marketer', description: 'Paid ads, conversion tracking.', role: 'specialist', layer: 'MARKETING' as any },
      { name: 'Content & Copywriter', description: 'Blog, email, ad copy.', role: 'specialist', layer: 'MARKETING' as any },
      { name: 'SEO Specialist', description: 'Keyword research, on-page SEO.', role: 'specialist', layer: 'MARKETING' as any },
      { name: 'Designer', description: 'Creative assets.', role: 'specialist', layer: 'MARKETING' as any },
      { name: 'Social & Community', description: 'Organic social posting.', role: 'specialist', layer: 'MARKETING' as any },
      { name: 'Operations Orchestrator', description: 'Decomposes ops tasks.', role: 'orchestrator', layer: 'OPERATIONS' as any },
      { name: 'Process & Workflow', description: 'Internal SOPs, automation.', role: 'specialist', layer: 'OPERATIONS' as any },
      { name: 'Vendor & Supply Chain', description: 'Vendor communication.', role: 'specialist', layer: 'OPERATIONS' as any },
      { name: 'Quality & Fulfillment', description: 'Order/delivery quality.', role: 'specialist', layer: 'OPERATIONS' as any },
      { name: 'Customer Support', description: 'Tier-1 support triage.', role: 'specialist', layer: 'OPERATIONS' as any },
      { name: 'Scheduling & Capacity Planning', description: 'Resource forecasting.', role: 'specialist', layer: 'OPERATIONS' as any },
      { name: 'Finance Orchestrator', description: 'Decomposes finance tasks.', role: 'orchestrator', layer: 'FINANCE' as any },
      { name: 'Bookkeeping', description: 'Transaction categorization.', role: 'specialist', layer: 'FINANCE' as any },
      { name: 'Cash Flow & Forecasting', description: 'Cash position, runway.', role: 'specialist', layer: 'FINANCE' as any },
      { name: 'Pricing & Unit Economics', description: 'Margin analysis.', role: 'specialist', layer: 'FINANCE' as any },
      { name: 'Compliance & Tax', description: 'Filing, GST/tax tracking.', role: 'specialist', layer: 'FINANCE' as any },
      { name: 'Fundraising & Investor Relations', description: 'Cap table, updates.', role: 'specialist', layer: 'FINANCE' as any },
    ];

    await this.prisma.agent.createMany({
      data: agents.map((a) => ({ ...a, founderId })),
    });
  }
}
