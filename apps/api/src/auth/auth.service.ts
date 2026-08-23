import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service.js';

interface SignupInput {
  email: string;
  password: string;
  name: string;
  businessName: string;
  businessDescription?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async signup(input: SignupInput) {
    const existing = await this.prisma.founder.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const founder = await this.prisma.founder.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        businessName: input.businessName,
        businessDescription: input.businessDescription ?? '',
      },
    });

    // Seed default agents for the founder
    await this.seedDefaultAgents(founder.id);

    const token = this.signToken(founder.id, founder.email);
    return {
      token,
      founder: this.sanitize(founder),
    };
  }

  async login(input: LoginInput) {
    const founder = await this.prisma.founder.findUnique({
      where: { email: input.email },
    });
    if (!founder) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, founder.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.signToken(founder.id, founder.email);
    return {
      token,
      founder: this.sanitize(founder),
    };
  }

  async validateTokenPayload(payload: { sub: string; email: string }) {
    const founder = await this.prisma.founder.findUnique({
      where: { id: payload.sub },
    });
    if (!founder) return null;
    return this.sanitize(founder);
  }

  private signToken(founderId: string, email: string): string {
    return this.jwt.sign({ sub: founderId, email });
  }

  private sanitize(founder: any) {
    const { passwordHash, ...rest } = founder;
    return rest;
  }

  /**
   * Seed the standard 21 sub-agents + 4 layer orchestrators + 1 global orchestrator
   * for a new founder.
   */
  private async seedDefaultAgents(founderId: string) {
    const agentDefinitions = [
      // Global Orchestrator
      {
        name: 'Global Orchestrator',
        description: 'Owns founder goals, context, and overall state. Routes tasks and resolves cross-layer conflicts.',
        type: 'GLOBAL_ORCHestrator' as const,
        layer: null,
      },
      // Research Layer
      {
        name: 'Research Orchestrator',
        description: 'Decomposes research tasks, manages research sub-agents.',
        type: 'LAYER_ORCHESTRATOR' as const,
        layer: 'RESEARCH' as const,
      },
      { name: 'Competitor Intelligence', description: 'Tracks named competitors — pricing changes, product launches, positioning shifts.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Market & Trend Scanning', description: 'Continuous scan of industry news, search trends, category shifts.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Pricing & Benchmarking', description: 'Maintains a live view of category pricing benchmarks.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Customer & Audience Research', description: 'Persona research, review mining, sentiment analysis.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      { name: 'Campaign Deep-Dive', description: 'Activated for specific research asks from Marketing layer.', type: 'SUB_AGENT' as const, layer: 'RESEARCH' as const },
      // Marketing Layer
      {
        name: 'Marketing Orchestrator',
        description: 'Decomposes marketing tasks, manages marketing sub-agents.',
        type: 'LAYER_ORCHESTRATOR' as const,
        layer: 'MARKETING' as const,
      },
      { name: 'Digital Marketing Strategist', description: 'Overall channel strategy, campaign planning.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Performance Marketer', description: 'Paid ads (Meta, Google), conversion tracking, budget pacing.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Content & Copywriter', description: 'Blog, email, ad copy, landing page copy.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'SEO Specialist', description: 'Keyword research, on-page SEO, content gap analysis.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Designer', description: 'Creative assets via Figma/Canva connectors.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      { name: 'Social & Community', description: 'Organic social posting, community engagement.', type: 'SUB_AGENT' as const, layer: 'MARKETING' as const },
      // Operations Layer
      {
        name: 'Operations Orchestrator',
        description: 'Decomposes operations tasks, manages ops sub-agents.',
        type: 'LAYER_ORCHESTRATOR' as const,
        layer: 'OPERATIONS' as const,
      },
      { name: 'Process & Workflow', description: 'Internal SOPs, task automation, workflow bottleneck detection.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Vendor & Supply Chain', description: 'Vendor communication, order tracking, delay detection.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Quality & Fulfillment', description: 'Order/delivery quality checks, fulfillment tracking.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Customer Support', description: 'Tier-1 support triage, FAQ handling, escalation to founder.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      { name: 'Scheduling & Capacity Planning', description: 'Resource/capacity forecasting, scheduling conflicts.', type: 'SUB_AGENT' as const, layer: 'OPERATIONS' as const },
      // Finance Layer
      {
        name: 'Finance Orchestrator',
        description: 'Decomposes finance tasks, manages finance sub-agents.',
        type: 'LAYER_ORCHESTRATOR' as const,
        layer: 'FINANCE' as const,
      },
      { name: 'Bookkeeping', description: 'Transaction categorization, reconciliation.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
      { name: 'Cash Flow & Forecasting', description: 'Real-time cash position, runway forecasting.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
      { name: 'Pricing & Unit Economics', description: 'Margin analysis, pricing recommendations.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
      { name: 'Compliance & Tax', description: 'Filing calendar, GST/tax obligation tracking.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
      { name: 'Fundraising & Investor Relations', description: 'Cap table hygiene, investor update drafting.', type: 'SUB_AGENT' as const, layer: 'FINANCE' as const },
    ];

    await this.prisma.agent.createMany({
      data: agentDefinitions.map((def) => ({
        ...def,
        founderId,
      })),
    });

    // Subscribe agents to their relevant signals
    const subscriptions = [
      // Research agents listen for research requests
      ...['Competitor Intelligence', 'Market & Trend Scanning', 'Pricing & Benchmarking', 'Customer & Audience Research', 'Campaign Deep-Dive'].map(
        (name) => ({ agentName: name, signalType: 'research.requested' }),
      ),
      // Marketing listens for ops/finance signals
      { agentName: 'Marketing Orchestrator', signalType: 'operations.feature_shipped' },
      { agentName: 'Marketing Orchestrator', signalType: 'finance.budget_constraint' },
      { agentName: 'Digital Marketing Strategist', signalType: 'finance.budget_constraint' },
      // Operations listens for marketing/finance signals
      { agentName: 'Operations Orchestrator', signalType: 'marketing.demand_spike_incoming' },
      { agentName: 'Operations Orchestrator', signalType: 'finance.budget_cut' },
      { agentName: 'Vendor & Supply Chain', signalType: 'marketing.demand_spike_incoming' },
      // Finance listens for almost everything
      { agentName: 'Finance Orchestrator', signalType: 'campaign.budget_exhausted' },
      { agentName: 'Finance Orchestrator', signalType: 'expense.spike' },
      { agentName: 'Cash Flow & Forecasting', signalType: 'campaign.budget_exhausted' },
      { agentName: 'Cash Flow & Forecasting', signalType: 'expense.spike' },
      { agentName: 'Bookkeeping', signalType: 'expense.spike' },
    ];

    // Look up agent IDs for subscriptions
    for (const sub of subscriptions) {
      const agent = await this.prisma.agent.findFirst({
        where: { founderId, name: sub.agentName },
      });
      if (agent) {
        await this.prisma.eventSubscription.create({
          data: {
            agentId: agent.id,
            signalType: sub.signalType,
            founderId,
          },
        });
      }
    }
  }
}
