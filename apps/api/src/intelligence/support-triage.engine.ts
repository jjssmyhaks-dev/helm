import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LLMService } from '../llm/llm.service.js';

export interface TriageResult {
  ticketId: string;
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry' | 'urgent';
  sentimentScore: number;  // -1 to 1
  category: string;
  subcategory: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  suggestedResponse: string;
  escalateToFounder: boolean;
  escalateReason?: string;
  similarPastTickets: string[];
  tags: string[];
  estimatedResolutionTime: string;
}

export interface FAQMatch {
  question: string;
  matchedFAQ: string;
  confidence: number;
  suggestedAnswer: string;
}

export interface SupportInsights {
  totalTickets: number;
  averageSentiment: number;
  topCategories: { category: string; count: number; avgSentiment: number }[];
  recurringIssues: string[];
  satisfactionTrend: 'improving' | 'stable' | 'declining';
  peakHours: string;
  recommendations: string[];
}

@Injectable()
export class SupportTriageEngine {
  private readonly logger = new Logger(SupportTriageEngine.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
  ) {}

  /**
   * Triage an incoming support ticket — classify, prioritize, draft response.
   */
  async triageTicket(
    founderId: string,
    ticket: {
      id: string;
      subject: string;
      body: string;
      channel: string;  // email, whatsapp, in-app
      customerName?: string;
    },
    faqs?: { question: string; answer: string }[],
  ): Promise<TriageResult> {
    this.logger.log(`Triaging ticket ${ticket.id} from ${ticket.channel}`);

    const context = await this.prisma.founderContext.findUnique({
      where: { founderId },
    });

    const faqSection = faqs?.length
      ? `\nFAQ Knowledge Base:\n${faqs.map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join('\n')}`
      : '';

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a customer support triage system. Analyze the support ticket and provide a comprehensive triage.

Output valid JSON:
{
  "sentiment": "positive|neutral|frustrated|angry|urgent",
  "sentimentScore": 0.0,  // -1 (very angry) to 1 (very happy)
  "category": "main category",
  "subcategory": "specific subcategory",
  "priority": "P1|P2|P3|P4",  // P1=emergency, P4=low
  "suggestedResponse": "A complete, empathetic, and helpful response to the customer",
  "escalateToFounder": false,
  "escalateReason": "reason if escalation needed, otherwise null",
  "tags": ["tag1", "tag2"],
  "estimatedResolutionTime": "e.g., 2 hours, 1 day, 1 week"
}

Priority rules:
- P1: Security issue, data loss, payment problem, service outage
- P2: Feature broken, billing error, repeated issue
- P3: Feature request, general question, how-to
- P4: Feedback, minor UI issue, nice-to-have

Escalate to founder if:
- Customer threatens to leave/churn
- Legal/regulatory mention
- Revenue impact > ₹10,000
- VIP/enterprise customer
- Issue involves founder personally`,
      },
      {
        role: 'user',
        content: `Triage this support ticket:

Channel: ${ticket.channel}
Subject: ${ticket.subject}
Message: ${ticket.body}
${ticket.customerName ? `Customer: ${ticket.customerName}` : ''}
${faqSection}
${context ? `Business Context: ${JSON.stringify(context.goals)}` : ''}

Provide a complete triage with a suggested response that's empathetic, specific, and actionable.`,
      },
    ], { maxTokens: 2048, temperature: 0.3 });

    let result: TriageResult;
    try {
      result = {
        ticketId: ticket.id,
        ...JSON.parse(response.content),
        similarPastTickets: [],
      };
    } catch {
      result = {
        ticketId: ticket.id,
        sentiment: 'neutral',
        sentimentScore: 0,
        category: 'General',
        subcategory: 'Uncategorized',
        priority: 'P3',
        suggestedResponse: response.content,
        escalateToFounder: false,
        similarPastTickets: [],
        tags: [],
        estimatedResolutionTime: '1 day',
      };
    }

    // Log the triage
    await this.prisma.activityLogEntry.create({
      data: {
        founderId,
        agentId: '',
        action: 'support_ticket_triaged',
        details: {
          ticketId: ticket.id,
          channel: ticket.channel,
          sentiment: result.sentiment,
          priority: result.priority,
          category: result.category,
          escalate: result.escalateToFounder,
        } as any,
        riskTier: result.escalateToFounder ? 'NOTIFY_AND_ACT' : 'AUTO_EXECUTE',
      },
    });

    return result;
  }

  /**
   * Match an incoming message against the FAQ knowledge base.
   */
  async matchFAQ(
    message: string,
    faqs: { question: string; answer: string }[],
  ): Promise<FAQMatch | null> {
    if (faqs.length === 0) return null;

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `Find the best matching FAQ for the customer's question. Output valid JSON:
{
  "matchedFAQ": "The matched question",
  "confidence": 0.0 to 1.0,
  "suggestedAnswer": "A natural-language answer incorporating the FAQ content"
}

If no FAQ matches well (confidence < 0.5), return null.`,
      },
      {
        role: 'user',
        content: `Customer message: "${message}"

FAQ Options:
${faqs.map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join('\n\n')}

Find the best match. If none match well, say null.`,
      },
    ], { maxTokens: 1024, temperature: 0.1 });

    try {
      const result = JSON.parse(response.content);
      if (result.confidence < 0.5) return null;
      return result as FAQMatch;
    } catch {
      return null;
    }
  }

  /**
   * Generate support insights from ticket history.
   */
  async generateInsights(
    founderId: string,
    tickets: {
      date: string;
      sentiment: string;
      category: string;
      resolved: boolean;
      resolutionTime?: number;
    }[],
  ): Promise<SupportInsights> {
    if (tickets.length === 0) {
      return {
        totalTickets: 0,
        averageSentiment: 0,
        topCategories: [],
        recurringIssues: [],
        satisfactionTrend: 'stable',
        peakHours: 'N/A',
        recommendations: ['Start tracking support tickets to build insights.'],
      };
    }

    const categoryMap = tickets.reduce<Record<string, { count: number; sentimentSum: number }>>((acc, t) => {
      if (!acc[t.category]) acc[t.category] = { count: 0, sentimentSum: 0 };
      acc[t.category].count++;
      acc[t.category].sentimentSum += t.sentiment === 'positive' ? 1 : t.sentiment === 'angry' ? -1 : 0;
      return acc;
    }, {});

    const topCategories = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        count: data.count,
        avgSentiment: data.sentimentSum / data.count,
      }))
      .sort((a, b) => b.count - a.count);

    const sentimentValues = tickets.map(t => {
      const map: Record<string, number> = { positive: 1, neutral: 0, frustrated: -0.5, angry: -1, urgent: -0.8 };
      return map[t.sentiment] || 0;
    });
    const avgSentiment = sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length;

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `Analyze support ticket data and generate insights. Output valid JSON:
{
  "recurringIssues": ["issue 1", "issue 2"],
  "satisfactionTrend": "improving|stable|declining",
  "peakHours": "description of peak support hours",
  "recommendations": ["recommendation 1", "recommendation 2"]
}`,
      },
      {
        role: 'user',
        content: `Support data summary:
- Total tickets: ${tickets.length}
- Average sentiment: ${avgSentiment.toFixed(2)} (-1=negative, 1=positive)
- Top categories: ${topCategories.slice(0, 5).map(c => `${c.category} (${c.count} tickets)`).join(', ')}
- Resolution rate: ${tickets.filter(t => t.resolved).length}/${tickets.length}
- Avg resolution time: ${tickets.filter(t => t.resolutionTime).reduce((s, t) => s + (t.resolutionTime || 0), 0) / Math.max(1, tickets.filter(t => t.resolutionTime).length)} hours`,
      },
    ], { maxTokens: 1024, temperature: 0.5 });

    let insights: Partial<SupportInsights> = {};
    try {
      insights = JSON.parse(response.content);
    } catch {
      insights = {
        recurringIssues: [],
        satisfactionTrend: 'stable',
        peakHours: 'N/A',
        recommendations: [response.content],
      };
    }

    return {
      totalTickets: tickets.length,
      averageSentiment: avgSentiment,
      topCategories,
      recurringIssues: insights.recurringIssues || [],
      satisfactionTrend: insights.satisfactionTrend || 'stable',
      peakHours: insights.peakHours || 'N/A',
      recommendations: insights.recommendations || [],
    };
  }

  /**
   * Auto-respond to common questions using FAQ matching + LLM.
   */
  async autoRespond(
    founderId: string,
    message: string,
    channel: string,
    faqs: { question: string; answer: string }[],
  ): Promise<{ response: string; handled: boolean; category: string }> {
    // First try FAQ matching
    if (faqs.length > 0) {
      const faqMatch = await this.matchFAQ(message, faqs);
      if (faqMatch && faqMatch.confidence > 0.7) {
        return {
          response: faqMatch.suggestedAnswer,
          handled: true,
          category: 'FAQ',
        };
      }
    }

    // Generate a response using LLM
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a helpful customer support agent for a startup. Respond to the customer's message in a friendly, professional way.
Be concise (2-3 sentences max). If you're unsure about something, acknowledge it and say you'll get back to them.
Channel: ${channel}. Match the tone to the channel (formal for email, casual for WhatsApp).`,
      },
      {
        role: 'user',
        content: `Customer message: "${message}"`,
      },
    ], { maxTokens: 512, temperature: 0.5 });

    return {
      response: response.content,
      handled: false, // Needs human review
      category: 'General',
    };
  }
}
