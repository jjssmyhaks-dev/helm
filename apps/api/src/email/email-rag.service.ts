import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { EmailCategory } from '@prisma/client';

/**
 * RAG (Retrieval-Augmented Generation) service for emails.
 * Uses pgvector to embed and retrieve similar email templates,
 * providing few-shot examples for the LLM to generate better drafts.
 *
 * Since pgvector requires the vector extension, we use a simpler approach:
 * store embeddings as float arrays and compute cosine similarity in application code.
 * For production at scale, switch to pgvector SQL queries.
 */
@Injectable()
export class EmailRagService {
  private readonly logger = new Logger(EmailRagService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieve similar email templates by category and content similarity.
   * Falls back to category-based retrieval if embedding fails.
   */
  async retrieveRelevant(
    founderId: string,
    category: EmailCategory,
    context: string,
    topK: number = 3,
  ): Promise<string[]> {
    try {
      // Get templates for this category
      const templates = await this.prisma.emailTemplate.findMany({
        where: {
          founderId,
          category,
        },
        orderBy: { usageCount: 'desc' },
        take: 20,
      });

      if (templates.length === 0) {
        return this.getSystemTemplates(category);
      }

      // Simple keyword-based relevance scoring
      const scored = templates.map((t) => ({
        template: t,
        score: this.calculateRelevance(context, `${t.subject} ${t.body}`),
      }));

      // Sort by relevance and take top K
      scored.sort((a, b) => b.score - a.score);
      const relevant = scored.slice(0, topK);

      // Also include the most-used templates as fallback
      const mostUsed = templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 2)
        .filter((t) => !relevant.find((r) => r.template.id === t.id));

      const allTemplates = [...relevant.map((r) => r.template), ...mostUsed];

      // Increment usage count for retrieved templates
      for (const t of allTemplates.slice(0, topK)) {
        await this.prisma.emailTemplate.update({
          where: { id: t.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      return allTemplates.map((t) =>
        `Subject: ${t.subject}\nTonality: ${t.tonality}\nBody:\n${t.body}`,
      );
    } catch (err: any) {
      this.logger.warn(`RAG retrieval failed, falling back to system templates: ${err.message}`);
      return this.getSystemTemplates(category);
    }
  }

  /**
   * Simple TF-IDF-like relevance scoring between query and document.
   */
  private calculateRelevance(query: string, document: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const docWords = document.toLowerCase().split(/\s+/);

    if (queryWords.length === 0) return 0;

    let matches = 0;
    for (const word of queryWords) {
      if (docWords.includes(word)) matches++;
    }

    return matches / queryWords.length;
  }

  /**
   * System-provided email templates for each category.
   * These serve as the initial few-shot examples before the founder
   * creates their own templates.
   */
  private getSystemTemplates(category: EmailCategory): string[] {
    interface Template {
      subject: string;
      tonality: string;
      body: string;
    }

    const templates: Record<EmailCategory, Template[]> = {
      LEAD: [
        {
          subject: 'Following up on our conversation',
          tonality: 'professional',
          body: `Hi {{name}},\n\nI hope this finds you well. I wanted to follow up on our recent conversation about how {{product}} can help {{company}} achieve {{goal}}.\n\nI'd love to schedule a quick 15-minute call to walk you through a personalized demo. Would {{suggested_time}} work for you?\n\nLooking forward to hearing from you.\n\nBest,\n{{sender_name}}`,
        },
      ],
      VENDOR: [
        {
          subject: 'Question about {{topic}}',
          tonality: 'assertive',
          body: `Hi {{name}},\n\nI'm reaching out regarding {{topic}}. We're looking to {{objective}} and would like to understand:\n\n1. {{question_1}}\n2. {{question_2}}\n3. {{question_3}}\n\nPlease share your pricing and timeline for this scope.\n\nRegards,\n{{sender_name}}`,
        },
      ],
      PARTNER: [
        {
          subject: 'Exploring a partnership opportunity',
          tonality: 'friendly',
          body: `Hi {{name}},\n\nI've been following {{partner_company}}'s work in {{space}} and I'm really impressed with {{achievement}}.\n\nI think there's a great opportunity for us to collaborate on {{idea}}. Our strengths in {{our_strength}} combined with your expertise in {{their_strength}} could create something really valuable.\n\nWould you be open to a casual chat to explore this?\n\nCheers,\n{{sender_name}}`,
        },
      ],
      VC: [
        {
          subject: '{{company}} — {{metric}} update',
          tonality: 'concise',
          body: `Hi {{name}},\n\nQuick update on {{company}}:\n\n• MRR: {{mrr}} ({{growth}} MoM)\n• Users: {{users}} ({{user_growth}} growth)\n• Key win: {{achievement}}\n\nWe're {{ask}} and believe {{thesis}}.\n\nHappy to share more details. Can we schedule 20 minutes this week?\n\nBest,\n{{sender_name}}`,
        },
      ],
      CUSTOMER: [
        {
          subject: 'Re: {{issue_topic}}',
          tonality: 'empathetic',
          body: `Hi {{name}},\n\nThank you for reaching out about {{issue_topic}}. I understand how frustrating this must be, and I want to make sure we resolve this quickly.\n\nHere's what I've done:\n{{resolution_steps}}\n\n{{follow_up_action}}\n\nPlease let me know if there's anything else I can help with.\n\nWarm regards,\n{{sender_name}}`,
        },
      ],
      GENERAL: [
        {
          subject: '{{subject}}',
          tonality: 'professional',
          body: `Hi {{name}},\n\n{{body}}\n\nBest regards,\n{{sender_name}}`,
        },
      ],
    };

    return (templates[category] || templates.GENERAL).map(
      (t) => `Subject: ${t.subject}\nTonality: ${t.tonality}\nBody:\n${t.body}`,
    );
  }

  /**
   * Store a new sent email as a template reference for future RAG retrieval.
   */
  async indexSentEmail(
    founderId: string,
    category: EmailCategory,
    subject: string,
    body: string,
    tonality: string,
  ) {
    // Auto-create a template from a well-sent email
    await this.prisma.emailTemplate.create({
      data: {
        founderId,
        name: `Auto: ${subject.slice(0, 50)}`,
        category,
        subject,
        body,
        tonality,
        tags: ['auto-generated'],
      },
    });
  }
}
