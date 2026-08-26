import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { EmailRagService } from './email-rag.service.js';
import { LLMService } from '../llm/llm.service.js';
import { EmailCategory, EmailDraftStatus } from '@prisma/client';

/** Tonality descriptions for the LLM prompt */
const TONALITY_MAP: Record<string, string> = {
  professional: 'Clear, respectful, and business-appropriate. Balanced between formal and approachable.',
  formal: 'Highly professional, structured, and traditional business communication style.',
  friendly: 'Warm, casual, and relationship-focused. Uses first names and conversational tone.',
  assertive: 'Direct, confident, and action-oriented. Gets to the point quickly.',
  empathetic: 'Understanding, patient, and solution-focused. Acknowledges feelings before解决问题.',
  concise: 'Ultra-brief, bullet-point driven, no fluff. Respects the reader\'s time.',
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private prisma: PrismaService,
    private rag: EmailRagService,
    private llm: LLMService,
  ) {}

  /**
   * AI-draft an email using RAG-retrieved examples and category-specific tonality.
   */
  async draftEmail(
    founderId: string,
    category: EmailCategory,
    context: {
      to?: string;
      subject?: string;
      keyPoints?: string[];
      tonality?: string;
      leadId?: string;
      additionalContext?: string;
    },
  ) {
    // Retrieve similar past emails via RAG
    const retrievedExamples = await this.rag.retrieveRelevant(
      founderId,
      category,
      `${context.subject || ''} ${context.keyPoints?.join(' ') || ''} ${context.additionalContext || ''}`,
    );

    const tonality = context.tonality || this.getDefaultTonality(category);
    const tonalityDesc = TONALITY_MAP[tonality] || TONALITY_MAP.professional;

    // Get founder info for personalization
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });

    const systemPrompt = `You are an expert email writer for ${founder?.businessName || 'a startup'}.
You write emails with this tonality: ${tonalityDesc}

Category: ${category}
${category === 'LEAD' ? 'Goal: Nurture the lead toward a meeting or demo.' : ''}
${category === 'VENDOR' ? 'Goal: Clear communication about requirements, pricing, and timelines.' : ''}
${category === 'PARTNER' ? 'Goal: Build relationship and explore mutual value.' : ''}
${category === 'VC' ? 'Goal: Concise update or pitch that shows traction and potential.' : ''}
${category === 'CUSTOMER' ? 'Goal: Resolve issues, build trust, and retain the customer.' : ''}

Output valid JSON with these fields:
{
  "subject": "<email subject line>",
  "body": "<email body in plain text, using \\n for line breaks>",
  "summary": "<one-line summary of what this email does>",
  "suggestions": ["<optional improvement suggestion>"]
}`;

    const examplesContext = retrievedExamples.length > 0
      ? `\n\nReference examples (match this style):\n${retrievedExamples.join('\n---\n')}`
      : '';

    const userPrompt = `Draft an email with these details:
${context.to ? `To: ${context.to}` : ''}
${context.subject ? `Subject hint: ${context.subject}` : ''}
Key points to cover: ${(context.keyPoints || ['General outreach']).join(', ')}
${context.additionalContext ? `Additional context: ${context.additionalContext}` : ''}
${context.leadId ? `This is for a lead in the pipeline.` : ''}
${examplesContext}

Write the email now.`;

    const response = await this.llm.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { maxTokens: 1024, temperature: 0.7 });

    try {
      const parsed = JSON.parse(response.content);

      // Save draft
      const draft = await this.prisma.emailDraft.create({
        data: {
          founderId,
          leadId: context.leadId,
          category,
          to: context.to || '',
          subject: parsed.subject,
          body: parsed.body,
          tonality,
          status: 'DRAFT',
        },
      });

      return {
        draft,
        summary: parsed.summary,
        suggestions: parsed.suggestions || [],
      };
    } catch (err: any) {
      this.logger.error(`Failed to parse LLM response: ${err.message}`);

      // Fallback: use raw response as body
      const draft = await this.prisma.emailDraft.create({
        data: {
          founderId,
          leadId: context.leadId,
          category,
          to: context.to || '',
          subject: context.subject || 'Draft Email',
          body: response.content,
          tonality,
          status: 'DRAFT',
        },
      });

      return { draft, summary: 'Draft created from raw response', suggestions: [] };
    }
  }

  /**
   * Send an approved email draft via Composio (Gmail/Outlook).
   */
  async sendEmail(draftId: string) {
    const draft = await this.prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: { founder: true },
    });

    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.status !== EmailDraftStatus.APPROVED) {
      throw new Error('Draft must be approved before sending');
    }

    try {
      // TODO: Wire to Composio for actual sending
      // For now, mark as sent
      const sentRecord = await this.prisma.emailSent.create({
        data: {
          draftId: draft.id,
          founderId: draft.founderId,
          to: draft.to,
          from: draft.founder.email,
          subject: draft.subject,
          body: draft.body,
          category: draft.category,
        },
      });

      await this.prisma.emailDraft.update({
        where: { id: draftId },
        data: { status: 'SENT', sentAt: new Date() },
      });

      // Index this sent email for future RAG retrieval
      await this.rag.indexSentEmail(
        draft.founderId,
        draft.category,
        draft.subject,
        draft.body,
        draft.tonality,
      );

      this.logger.log(`Email sent: ${draftId} to ${draft.to}`);

      return sentRecord;
    } catch (err: any) {
      await this.prisma.emailDraft.update({
        where: { id: draftId },
        data: { status: 'FAILED' },
      });

      throw new Error(`Failed to send email: ${err.message}`);
    }
  }

  /**
   * Approve a draft for sending.
   */
  async approveDraft(draftId: string) {
    const draft = await this.prisma.emailDraft.findUnique({ where: { id: draftId } });
    if (!draft) throw new NotFoundException('Draft not found');

    return this.prisma.emailDraft.update({
      where: { id: draftId },
      data: { status: 'APPROVED' },
    });
  }

  /**
   * Get all templates, optionally filtered by category.
   */
  async getTemplates(founderId: string, category?: EmailCategory) {
    return this.prisma.emailTemplate.findMany({
      where: {
        founderId,
        ...(category ? { category } : {}),
      },
      orderBy: { usageCount: 'desc' },
    });
  }

  /**
   * Create a new email template.
   */
  async createTemplate(
    founderId: string,
    data: {
      name: string;
      category: EmailCategory;
      subject: string;
      body: string;
      tonality: string;
      tags?: string[];
    },
  ) {
    return this.prisma.emailTemplate.create({
      data: {
        founderId,
        ...data,
        tags: data.tags || [],
      },
    });
  }

  /**
   * Get sent email stats by category.
   */
  async getStats(founderId: string) {
    const sent = await this.prisma.emailSent.groupBy({
      by: ['category'],
      where: { founderId },
      _count: { id: true },
    });

    const drafts = await this.prisma.emailDraft.groupBy({
      by: ['status'],
      where: { founderId },
      _count: { id: true },
    });

    return {
      sentByCategory: sent.map((s) => ({ category: s.category, count: s._count.id })),
      draftsByStatus: drafts.map((d) => ({ status: d.status, count: d._count.id })),
      totalSent: sent.reduce((sum, s) => sum + s._count.id, 0),
      totalDrafts: drafts.reduce((sum, d) => sum + d._count.id, 0),
    };
  }

  /**
   * Get all drafts for a founder.
   */
  async getDrafts(founderId: string, status?: EmailDraftStatus) {
    return this.prisma.emailDraft.findMany({
      where: {
        founderId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { lead: { select: { name: true, company: true } } },
    });
  }

  /**
   * Get sent emails for a founder.
   */
  async getSentEmails(founderId: string) {
    return this.prisma.emailSent.findMany({
      where: { founderId },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Delete a template.
   */
  async deleteTemplate(founderId: string, templateId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id: templateId, founderId },
    });
    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.emailTemplate.delete({ where: { id: templateId } });
  }

  private getDefaultTonality(category: EmailCategory): string {
    const defaults: Record<EmailCategory, string> = {
      LEAD: 'professional',
      VENDOR: 'assertive',
      PARTNER: 'friendly',
      VC: 'concise',
      CUSTOMER: 'empathetic',
      GENERAL: 'professional',
    };
    return defaults[category];
  }
}
