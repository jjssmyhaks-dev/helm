import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AgentLayer } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private prisma: PrismaService) {}

  async syncUser(clerkUser: { id: string; email: string; name?: string }) {
    let founder = await this.prisma.founder.findUnique({
      where: { clerkUserId: clerkUser.id },
    });

    if (!founder) {
      founder = await this.prisma.founder.create({
        data: {
          id: crypto.randomUUID(),
          clerkUserId: clerkUser.id,
          email: clerkUser.email,
          name: clerkUser.name || clerkUser.email.split('@')[0],
        },
      });
      await this.seedDefaultAgents(founder.id);
      this.logger.log(`Created founder: ${founder.id}`);
    }

    return founder;
  }

  async getFounder(clerkUserId: string) {
    return this.prisma.founder.findUnique({ where: { clerkUserId } });
  }

  private async seedDefaultAgents(founderId: string) {
    const agents = [
      { name: 'Global Orchestrator', description: 'Owns founder goals and routing.', role: 'orchestrator', layer: 'RESEARCH' as AgentLayer },
      { name: 'Research Orchestrator', description: 'Decomposes research tasks.', role: 'orchestrator', layer: 'RESEARCH' as AgentLayer },
      { name: 'Competitor Intelligence', description: 'Tracks named competitors.', role: 'specialist', layer: 'RESEARCH' as AgentLayer },
      { name: 'Market & Trend Scanning', description: 'Industry news and trends.', role: 'specialist', layer: 'RESEARCH' as AgentLayer },
      { name: 'Pricing & Benchmarking', description: 'Category pricing benchmarks.', role: 'specialist', layer: 'RESEARCH' as AgentLayer },
      { name: 'Customer & Audience Research', description: 'Persona research, sentiment.', role: 'specialist', layer: 'RESEARCH' as AgentLayer },
      { name: 'Campaign Deep-Dive', description: 'On-demand research.', role: 'specialist', layer: 'RESEARCH' as AgentLayer },
      { name: 'Marketing Orchestrator', description: 'Decomposes marketing tasks.', role: 'orchestrator', layer: 'MARKETING' as AgentLayer },
      { name: 'Digital Marketing Strategist', description: 'Channel strategy.', role: 'specialist', layer: 'MARKETING' as AgentLayer },
      { name: 'Performance Marketer', description: 'Paid ads, conversion tracking.', role: 'specialist', layer: 'MARKETING' as AgentLayer },
      { name: 'Content & Copywriter', description: 'Blog, email, ad copy.', role: 'specialist', layer: 'MARKETING' as AgentLayer },
      { name: 'SEO Specialist', description: 'Keyword research, on-page SEO.', role: 'specialist', layer: 'MARKETING' as AgentLayer },
      { name: 'Designer', description: 'Creative assets.', role: 'specialist', layer: 'MARKETING' as AgentLayer },
      { name: 'Social & Community', description: 'Organic social posting.', role: 'specialist', layer: 'MARKETING' as AgentLayer },
      { name: 'Operations Orchestrator', description: 'Decomposes ops tasks.', role: 'orchestrator', layer: 'OPERATIONS' as AgentLayer },
      { name: 'Process & Workflow', description: 'Internal SOPs, automation.', role: 'specialist', layer: 'OPERATIONS' as AgentLayer },
      { name: 'Vendor & Supply Chain', description: 'Vendor communication.', role: 'specialist', layer: 'OPERATIONS' as AgentLayer },
      { name: 'Quality & Fulfillment', description: 'Order/delivery quality.', role: 'specialist', layer: 'OPERATIONS' as AgentLayer },
      { name: 'Customer Support', description: 'Tier-1 support triage.', role: 'specialist', layer: 'OPERATIONS' as AgentLayer },
      { name: 'Scheduling & Capacity Planning', description: 'Resource forecasting.', role: 'specialist', layer: 'OPERATIONS' as AgentLayer },
      { name: 'Finance Orchestrator', description: 'Decomposes finance tasks.', role: 'orchestrator', layer: 'FINANCE' as AgentLayer },
      { name: 'Bookkeeping', description: 'Transaction categorization.', role: 'specialist', layer: 'FINANCE' as AgentLayer },
      { name: 'Cash Flow & Forecasting', description: 'Cash position, runway.', role: 'specialist', layer: 'FINANCE' as AgentLayer },
      { name: 'Pricing & Unit Economics', description: 'Margin analysis.', role: 'specialist', layer: 'FINANCE' as AgentLayer },
      { name: 'Compliance & Tax', description: 'Filing, GST/tax tracking.', role: 'specialist', layer: 'FINANCE' as AgentLayer },
      { name: 'Fundraising & Investor Relations', description: 'Cap table, updates.', role: 'specialist', layer: 'FINANCE' as AgentLayer },
    ];

    await this.prisma.agent.createMany({
      data: agents.map((a) => ({ ...a, founderId })),
    });
  }
}
