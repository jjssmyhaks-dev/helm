import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LeadScoringService } from './lead-scoring.service.js';
import { LeadStatus, Prisma } from '@prisma/client';

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private prisma: PrismaService,
    private scoring: LeadScoringService,
  ) {}

  async create(founderId: string, data: Omit<Prisma.LeadCreateInput, 'founder'>) {
    const lead = await this.prisma.lead.create({
      data: { ...data, founder: { connect: { id: founderId } } },
    });

    // Auto-score new lead
    this.scoring.scoreLead(lead.id).catch((err) =>
      this.logger.warn(`Auto-scoring failed for lead ${lead.id}: ${err.message}`),
    );

    return lead;
  }

  async findAll(
    founderId: string,
    filters?: {
      status?: LeadStatus;
      minScore?: number;
      maxScore?: number;
      search?: string;
      source?: string;
    },
  ) {
    const where: Prisma.LeadWhereInput = { founderId };

    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.minScore || filters?.maxScore) {
      where.score = {};
      if (filters.minScore) where.score.gte = filters.minScore;
      if (filters.maxScore) where.score.lte = filters.maxScore;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: { scoreHistory: { orderBy: { scoredAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(founderId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, founderId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        scoreHistory: { orderBy: { scoredAt: 'desc' }, take: 5 },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(founderId: string, leadId: string, data: Prisma.LeadUpdateInput) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, founderId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.lead.update({
      where: { id: leadId },
      data,
    });
  }

  async delete(founderId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, founderId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.lead.delete({ where: { id: leadId } });
  }

  async scoreLead(founderId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, founderId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.scoring.scoreLead(leadId);
  }

  async addActivity(
    founderId: string,
    leadId: string,
    type: string,
    description: string,
    metadata?: Record<string, unknown>,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, founderId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const activity = await this.prisma.leadActivity.create({
      data: {
        leadId,
        type,
        description,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    });

    // Update lastContactedAt if it's a contact-type activity
    if (['email_sent', 'call', 'meeting', 'linkedin_message'].includes(type)) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { lastContactedAt: new Date() },
      });
    }

    return activity;
  }

  async getPipelineStats(founderId: string) {
    const leads = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { founderId },
      _count: { id: true },
      _avg: { score: true },
    });

    const total = leads.reduce((sum, g) => sum + g._count.id, 0);

    const pipeline = Object.values(LeadStatus).map((status) => {
      const group = leads.find((l) => l.status === status);
      return {
        status,
        count: group?._count.id || 0,
        avgScore: group?._avg.score || 0,
        percentage: total > 0 ? Math.round(((group?._count.id || 0) / total) * 100) : 0,
      };
    });

    const overallAvgScore = await this.prisma.lead.aggregate({
      where: { founderId },
      _avg: { score: true },
      _count: { id: true },
    });

    const conversionRate = await this.calculateConversionRate(founderId);

    return {
      pipeline,
      total,
      avgScore: overallAvgScore._avg.score || 0,
      conversionRate,
    };
  }

  private async calculateConversionRate(founderId: string): Promise<number> {
    const total = await this.prisma.lead.count({ where: { founderId } });
    if (total === 0) return 0;

    const converted = await this.prisma.lead.count({
      where: { founderId, status: 'CLOSED_WON' },
    });

    return Math.round((converted / total) * 100);
  }

  async suggestNextAction(founderId: string, leadId: string) {
    const lead = await this.findOne(founderId, leadId);

    const suggestions: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }> = [];

    // Status-based suggestions
    switch (lead.status) {
      case 'NEW':
        if (!lead.lastContactedAt) {
          suggestions.push({
            action: 'Send a personalized intro email',
            reason: 'This lead has not been contacted yet. First impressions matter.',
            priority: 'high',
          });
        }
        if (lead.score && lead.score < 40) {
          suggestions.push({
            action: 'Research lead background before outreach',
            reason: 'Low score suggests limited fit — qualify before investing time.',
            priority: 'medium',
          });
        }
        break;
      case 'CONTACTED':
        suggestions.push({
          action: 'Follow up within 48 hours',
          reason: 'Response rates drop 50% after 48 hours without follow-up.',
          priority: 'high',
        });
        break;
      case 'QUALIFIED':
        suggestions.push({
          action: 'Schedule a discovery call',
          reason: 'Lead is qualified — move to conversation to understand needs.',
          priority: 'high',
        });
        break;
      case 'MEETING':
        suggestions.push({
          action: 'Send a proposal or deck',
          reason: 'After meeting, send a tailored proposal to keep momentum.',
          priority: 'high',
        });
        break;
      case 'PROPOSAL':
        suggestions.push({
          action: 'Follow up on proposal',
          reason: 'Check if the proposal was reviewed and address objections.',
          priority: 'medium',
        });
        break;
      case 'CLOSED_LOST':
        suggestions.push({
          action: 'Send a "keeping in touch" email in 3 months',
          reason: 'Lost leads can revive — nurture the relationship.',
          priority: 'low',
        });
        break;
    }

    // Score-based suggestions
    if (lead.score && lead.score > 80) {
      suggestions.push({
        action: 'Prioritize this lead — high score indicates strong fit',
        reason: 'This lead scored in the top tier. Fast-track engagement.',
        priority: 'high',
      });
    }

    // Activity-based suggestions
    if (lead.activities.length === 0) {
      suggestions.push({
        action: 'Add first activity note',
        reason: 'No activity recorded. Start tracking interactions.',
        priority: 'low',
      });
    }

    return { lead: { id: lead.id, name: lead.name, status: lead.status, score: lead.score }, suggestions };
  }

  async importLeads(
    founderId: string,
    leads: Array<{
      name: string;
      email?: string;
      company?: string;
      title?: string;
      source?: string;
      phone?: string;
      linkedinUrl?: string;
      website?: string;
    }>,
  ) {
    const created = await this.prisma.lead.createMany({
      data: leads.map((l) => ({
        founderId,
        name: l.name,
        email: l.email,
        company: l.company,
        title: l.title,
        source: l.source || 'import',
        phone: l.phone,
        linkedinUrl: l.linkedinUrl,
        website: l.website,
      })),
    });

    // Auto-score all imported leads
    const importedLeads = await this.prisma.lead.findMany({
      where: { founderId, source: 'import' },
      orderBy: { createdAt: 'desc' },
      take: leads.length,
    });

    for (const lead of importedLeads) {
      this.scoring.scoreLead(lead.id).catch((err) =>
        this.logger.warn(`Auto-scoring failed for lead ${lead.id}: ${err.message}`),
      );
    }

    return { imported: created.count, leads: importedLeads };
  }
}
