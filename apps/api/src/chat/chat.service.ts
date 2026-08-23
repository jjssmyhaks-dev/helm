import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ContextService } from '../context/context.service.js';
import { LLMService } from '../llm/llm.service.js';
import { MarketingCampaignEngine } from '../intelligence/marketing-campaign.engine.js';
import { CashflowAnalysisEngine } from '../intelligence/cashflow-analysis.engine.js';
import { CompetitorIntelligenceEngine } from '../intelligence/competitor-intelligence.engine.js';
import { SupportTriageEngine } from '../intelligence/support-triage.engine.js';
import { Observable, Subject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';

/**
 * Intent categories that map to intelligence engines.
 */
type IntentCategory = 'marketing' | 'cashflow' | 'competitor' | 'support' | 'general';

interface ClassifiedIntent {
  category: IntentCategory;
  confidence: number;
  params: Record<string, string>;
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private contextService: ContextService,
    private llm: LLMService,
    private marketing: MarketingCampaignEngine,
    private cashflow: CashflowAnalysisEngine,
    private competitor: CompetitorIntelligenceEngine,
    private support: SupportTriageEngine,
  ) {}

  /**
   * Process a founder's message with smart intent routing.
   * Detects the intent category and routes to the appropriate intelligence engine.
   */
  async processMessage(founderId: string, content: string, sessionId?: string) {
    // Get or create session
    let session;
    if (sessionId) {
      session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, founderId },
      });
    }
    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { founderId, title: content.slice(0, 80) },
      });
    }

    // Save founder message
    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'FOUNDER', content },
    });

    // Classify intent and route to engine
    const intent = await this.classifyIntent(content);
    const result = await this.routeToEngine(founderId, intent, content);

    // Save agent response
    const responseMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'AGENT',
        content: result.response,
        metadata: {
          intent: intent.category,
          confidence: intent.confidence,
          engineUsed: result.engineUsed,
        },
      },
    });

    return {
      message: responseMessage,
      sessionId: session.id,
      intent: intent.category,
      spawnedTasks: [],
    };
  }

  /**
   * Classify the founder's message into an intent category.
   */
  private async classifyIntent(content: string): Promise<ClassifiedIntent> {
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `Classify this founder message into ONE category. Output valid JSON:
{
  "category": "marketing|cashflow|competitor|support|general",
  "confidence": 0.0-1.0,
  "params": { key extracted params }
}

Category rules:
- "marketing": campaign creation, ad strategy, content planning, SEO, social media, A/B testing, budget allocation
- "cashflow": cash flow analysis, runway, burn rate, revenue, expenses, unit economics, financial health
- "competitor": competitor analysis, market research, pricing benchmarks, competitive landscape, industry trends
- "support": customer support, ticket triage, FAQ, customer issues, sentiment
- "general": anything else — greetings, general questions, status checks

Extract key params:
- marketing: product, audience, budget, goals
- cashflow: transactions, balance, business type
- competitor: competitor name, industry, product
- support: message content, channel`,
      },
      {
        role: 'user',
        content: content,
      },
    ], { maxTokens: 512, temperature: 0.1 });

    try {
      const parsed = JSON.parse(response.content);
      if (['marketing', 'cashflow', 'competitor', 'support', 'general'].includes(parsed.category)) {
        return parsed as ClassifiedIntent;
      }
    } catch {
      // fall through to general
    }

    return { category: 'general', confidence: 0.5, params: {} };
  }

  /**
   * Route the classified intent to the appropriate intelligence engine.
   */
  private async routeToEngine(
    founderId: string,
    intent: ClassifiedIntent,
    originalMessage: string,
  ): Promise<{ response: string; engineUsed: string }> {
    switch (intent.category) {
      case 'marketing':
        return this.handleMarketingIntent(founderId, intent.params, originalMessage);
      case 'cashflow':
        return this.handleCashflowIntent(founderId, intent.params, originalMessage);
      case 'competitor':
        return this.handleCompetitorIntent(founderId, intent.params, originalMessage);
      case 'support':
        return this.handleSupportIntent(founderId, intent.params, originalMessage);
      default:
        return this.handleGeneralIntent(founderId, originalMessage);
    }
  }

  // ─── Marketing Intent Handlers ─────────────────────────────

  private async handleMarketingIntent(
    founderId: string,
    params: Record<string, string>,
    message: string,
  ): Promise<{ response: string; engineUsed: string }> {
    // Check if the founder wants a campaign plan
    if (message.toLowerCase().includes('campaign') || message.toLowerCase().includes('plan')) {
      const product = params.product || message;
      const audience = params.audience || 'Indian startup founders';
      const budget = parseInt(params.budget || '50000', 10);

      const plan = await this.marketing.createCampaignPlan(founderId, {
        product,
        targetAudience: audience,
        budget,
        goals: params.goals ? [params.goals] : ['Awareness and customer acquisition'],
      });

      const response = this.formatCampaignPlan(plan);
      return { response, engineUsed: 'marketing-campaign-engine' };
    }

    // Check for A/B testing
    if (message.toLowerCase().includes('a/b') || message.toLowerCase().includes('ab test') || message.toLowerCase().includes('variant')) {
      const variants = await this.marketing.generateABTestVariants('ad_copy', {
        product: params.product || message,
        audience: params.audience || 'Indian startup founders',
        goal: params.goals || 'Increase conversions',
      });

      const response = this.formatABTest(variants);
      return { response, engineUsed: 'marketing-campaign-engine' };
    }

    // Check for budget optimization
    if (message.toLowerCase().includes('budget') || message.toLowerCase().includes('allocate') || message.toLowerCase().includes('spend')) {
      const budget = parseInt(params.budget || '100000', 10);
      const optimization = await this.marketing.optimizeBudgetAllocation(budget);

      const response = this.formatBudgetOptimization(optimization);
      return { response, engineUsed: 'marketing-campaign-engine' };
    }

    // General marketing query — respond with LLM
    return this.handleGeneralIntent(founderId, message);
  }

  // ─── Cashflow Intent Handlers ─────────────────────────────

  private async handleCashflowIntent(
    founderId: string,
    params: Record<string, string>,
    message: string,
  ): Promise<{ response: string; engineUsed: string }> {
    // Check for unit economics calculation
    if (message.toLowerCase().includes('unit economics') || message.toLowerCase().includes('cac') || message.toLowerCase().includes('ltv') || message.toLowerCase().includes('saas metrics')) {
      // Founder needs to provide these numbers — ask for them
      const response = `To calculate your unit economics, I need these numbers:\n\n` +
        `1. **Total marketing spend** (last month/quarter)\n` +
        `2. **New customers acquired** in that period\n` +
        `3. **Monthly Recurring Revenue (MRR)**\n` +
        `4. **Annual Recurring Revenue (ARR)**\n` +
        `5. **Cost of Goods Sold (COGS)** if applicable\n\n` +
        `Just share these numbers and I'll calculate your CAC, LTV, LTV:CAC ratio, payback period, and overall health score.`;
      return { response, engineUsed: 'cashflow-analysis-engine' };
    }

    // Check for cashflow analysis
    if (message.toLowerCase().includes('cash flow') || message.toLowerCase().includes('runway') || message.toLowerCase().includes('burn rate')) {
      const response = `To analyze your cashflow, I need:\n\n` +
        `1. **Current bank balance**\n` +
        `2. **Monthly income** (or recent transaction list)\n` +
        `3. **Monthly expenses** (or recent transaction list)\n\n` +
        `You can share a CSV of transactions or just tell me the numbers. I'll generate a full cashflow report with runway forecast, alerts, and recommendations.`;
      return { response, engineUsed: 'cashflow-analysis-engine' };
    }

    return this.handleGeneralIntent(founderId, message);
  }

  // ─── Competitor Intent Handlers ────────────────────────────

  private async handleCompetitorIntent(
    founderId: string,
    params: Record<string, string>,
    message: string,
  ): Promise<{ response: string; engineUsed: string }> {
    // Check for market analysis
    if (message.toLowerCase().includes('market') || message.toLowerCase().includes('industry') || message.toLowerCase().includes('landscape')) {
      const industry = params.industry || 'Indian SaaS';
      const product = params.product || message;

      const analysis = await this.competitor.analyzeMarket(founderId, industry, product);

      const response = this.formatMarketAnalysis(analysis);
      return { response, engineUsed: 'competitor-intelligence-engine' };
    }

    // Check for pricing benchmark
    if (message.toLowerCase().includes('pricing') || message.toLowerCase().includes('price') || message.toLowerCase().includes('benchmark')) {
      const product = params.product || message;
      const industry = params.industry || 'Indian SaaS';

      const benchmark = await this.competitor.benchmarkPricing(founderId, product, industry);

      const response = this.formatPricingBenchmark(benchmark);
      return { response, engineUsed: 'competitor-intelligence-engine' };
    }

    // Check for weekly digest
    if (message.toLowerCase().includes('digest') || message.toLowerCase().includes('weekly') || message.toLowerCase().includes('summary')) {
      const digest = await this.competitor.generateCompetitiveDigest(
        founderId,
        params.competitors ? params.competitors.split(',') : ['Generic competitor'],
        params.industry || 'Indian SaaS',
      );

      const response = this.formatDigest(digest);
      return { response, engineUsed: 'competitor-intelligence-engine' };
    }

    // Default: profile a specific competitor
    const competitorName = params.competitor || params.name || message.replace(/competitor|analyze|research|about/gi, '').trim();
    if (competitorName.length > 2) {
      const profile = await this.competitor.profileCompetitor(founderId, competitorName, params.industry || 'Indian SaaS');
      const response = this.formatCompetitorProfile(profile);
      return { response, engineUsed: 'competitor-intelligence-engine' };
    }

    return this.handleGeneralIntent(founderId, message);
  }

  // ─── Support Intent Handlers ───────────────────────────────

  private async handleSupportIntent(
    founderId: string,
    params: Record<string, string>,
    message: string,
  ): Promise<{ response: string; engineUsed: string }> {
    // Check for insights
    if (message.toLowerCase().includes('insight') || message.toLowerCase().includes('analytics') || message.toLowerCase().includes('stats')) {
      const response = `To generate support insights, I need your ticket history data.\n\n` +
        `Share a list of tickets with:\n` +
        `- Date\n` +
        `- Sentiment (positive/neutral/frustrated/angry)\n` +
        `- Category\n` +
        `- Resolved (yes/no)\n\n` +
        `I'll analyze trends, identify recurring issues, and recommend improvements.`;
      return { response, engineUsed: 'support-triage-engine' };
    }

    // Default: triage the message as if it were a support ticket
    const triage = await this.support.triageTicket(founderId, {
      id: `chat_${Date.now()}`,
      subject: 'Chat support request',
      body: message,
      channel: 'in-app',
    });

    const response = this.formatTriageResult(triage);
    return { response, engineUsed: 'support-triage-engine' };
  }

  // ─── General Intent Handler ────────────────────────────────

  private async handleGeneralIntent(
    founderId: string,
    message: string,
  ): Promise<{ response: string; engineUsed: string }> {
    const context = await this.contextService.retrieveRelevant(founderId, message);

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are Helm, an AI operating system for solo founders. You have specialist agents across Research, Marketing, Operations, and Finance. Respond concisely and helpfully. If the founder's message would benefit from a specific analysis (marketing campaign, cashflow, competitor research, support triage), suggest they ask for it specifically.`,
      },
      {
        role: 'user',
        content: context.length > 0
          ? `Context from memory:\n${context.join('\n')}\n\nFounder: ${message}`
          : message,
      },
    ], { maxTokens: 1024, temperature: 0.5 });

    return { response: response.content, engineUsed: 'llm-general' };
  }

  // ─── Formatters ────────────────────────────────────────────

  private formatCampaignPlan(plan: any): string {
    let md = `## 📋 Campaign Plan: ${plan.name}\n\n`;
    md += `**Objective:** ${plan.objective}\n\n`;

    if (plan.channels?.length > 0) {
      md += `### Channels\n\n`;
      for (const ch of plan.channels) {
        md += `- **${ch.channel}** — ₹${ch.budget?.toLocaleString('en-IN') || 'TBD'}/month\n`;
        md += `  Strategy: ${ch.contentStrategy}\n`;
        md += `  Audience: ${ch.targetAudience}\n`;
        md += `  Est. Reach: ${ch.estimatedReach?.toLocaleString('en-IN') || 'TBD'} | CPC: ₹${ch.estimatedCPC || 'TBD'}\n\n`;
      }
    }

    if (plan.budget) {
      md += `### Budget\n`;
      md += `- Total: ₹${plan.budget.totalBudget?.toLocaleString('en-IN')}\n`;
      md += `- Expected ROI: ${plan.budget.expectedROI}x\n`;
      md += `- Contingency: ${plan.budget.contingencyPercent}%\n\n`;
    }

    if (plan.timeline?.length > 0) {
      md += `### Timeline\n`;
      for (const phase of plan.timeline) {
        md += `- **${phase.phase}** (${phase.startDate} → ${phase.endDate})\n`;
        md += `  Milestone: ${phase.milestone}\n`;
      }
    }

    if (plan.kpis?.length > 0) {
      md += `\n### KPIs\n`;
      for (const kpi of plan.kpis) {
        md += `- ${kpi.metric}: Target ${kpi.target} ${kpi.unit}\n`;
      }
    }

    if (plan.riskAssessment) {
      md += `\n### ⚠️ Risk Assessment\n${plan.riskAssessment}\n`;
    }

    return md;
  }

  private formatABTest(variants: any): string {
    let md = `## 🧪 A/B Test Variants\n\n`;
    for (const v of variants.variants || []) {
      md += `### ${v.name}\n`;
    md += `${v.content}\n`;
      md += `**Hypothesis:** ${v.hypothesis}\n\n`;
    }
    if (variants.testPlan) {
      md += `### Test Plan\n${variants.testPlan}\n`;
    }
    return md;
  }

  private formatBudgetOptimization(optimization: any): string {
    let md = `## 💰 Budget Optimization\n\n`;
    if (optimization.allocation) {
      md += `### Recommended Allocation\n`;
      for (const [channel, amount] of Object.entries(optimization.allocation)) {
        md += `- **${channel}**: ₹${(amount as number).toLocaleString('en-IN')}\n`;
      }
    }
    if (optimization.reasoning) md += `\n### Reasoning\n${optimization.reasoning}\n`;
    if (optimization.expectedOutcome) md += `\n### Expected Outcome\n${optimization.expectedOutcome}\n`;
    return md;
  }

  private formatMarketAnalysis(analysis: any): string {
    let md = `## 📊 Market Analysis\n\n`;
    if (analysis.marketSize) md += `**Market Size:** ${analysis.marketSize}\n`;
    if (analysis.growthRate) md += `**Growth Rate:** ${analysis.growthRate}\n\n`;

    if (analysis.trends?.length > 0) {
      md += `### Trends\n`;
      for (const t of analysis.trends) {
        md += `- **${t.trend}** (${t.direction}, impact: ${t.impact})\n`;
        md += `  ${t.recommendation}\n`;
      }
    }

    if (analysis.opportunities?.length > 0) {
      md += `\n### Opportunities\n`;
      for (const o of analysis.opportunities) md += `- ${o}\n`;
    }

    if (analysis.positioningRecommendation) {
      md += `\n### Positioning\n${analysis.positioningRecommendation}\n`;
    }
    return md;
  }

  private formatPricingBenchmark(benchmark: any): string {
    let md = `## 💲 Pricing Benchmark\n\n`;
    if (benchmark.competitors?.length > 0) {
      md += `### Competitor Pricing\n`;
      for (const c of benchmark.competitors) {
        md += `- **${c.name}**: ${c.price} (${c.model})\n`;
      }
    }
    if (benchmark.marketAverage) md += `\n**Market Average:** ${benchmark.marketAverage}\n`;
    if (benchmark.position) md += `**Your Position:** ${benchmark.position}\n`;
    if (benchmark.recommendation) md += `\n### Recommendation\n${benchmark.recommendation}\n`;
    return md;
  }

  private formatDigest(digest: any): string {
    let md = `## 📰 Weekly Competitive Digest\n\n`;
    if (digest.digest) md += `${digest.digest}\n\n`;
    if (digest.keyTakeaways?.length > 0) {
      md += `### Key Takeaways\n`;
      for (const t of digest.keyTakeaways) md += `- ${t}\n`;
    }
    if (digest.actionItems?.length > 0) {
      md += `\n### Action Items\n`;
      for (const a of digest.actionItems) md += `- [ ] ${a}\n`;
    }
    return md;
  }

  private formatCompetitorProfile(profile: any): string {
    let md = `## 🏢 Competitor: ${profile.name}\n\n`;
    if (profile.positioning) md += `**Positioning:** ${profile.positioning}\n`;
    if (profile.targetAudience) md += `**Target:** ${profile.targetAudience}\n`;
    if (profile.pricingModel) md += `**Pricing:** ${profile.pricingModel}\n`;
    if (profile.threatLevel) md += `**Threat Level:** ${profile.threatLevel}\n\n`;

    if (profile.strengths?.length > 0) {
      md += `### Strengths\n`;
      for (const s of profile.strengths) md += `- ✅ ${s}\n`;
    }
    if (profile.weaknesses?.length > 0) {
      md += `\n### Weaknesses\n`;
      for (const w of profile.weaknesses) md += `- ❌ ${w}\n`;
    }
    return md;
  }

  private formatTriageResult(triage: any): string {
    let md = `## 🎫 Support Ticket Triage\n\n`;
    md += `**Sentiment:** ${triage.sentiment} (${triage.sentimentScore})\n`;
    md += `**Priority:** ${triage.priority}\n`;
    md += `**Category:** ${triage.category} / ${triage.subcategory}\n`;
    md += `**Est. Resolution:** ${triage.estimatedResolutionTime}\n\n`;

    if (triage.suggestedResponse) {
      md += `### Suggested Response\n> ${triage.suggestedResponse}\n\n`;
    }

    if (triage.escalateToFounder) {
      md += `### 🚨 ESCALATION NEEDED\n${triage.escalateReason}\n\n`;
    }

    if (triage.tags?.length > 0) {
      md += `**Tags:** ${triage.tags.join(', ')}\n`;
    }
    return md;
  }

  // ─── Voice and History ────────────────────────────────────

  async processVoice(founderId: string, transcript: string, sessionId?: string) {
    return this.processMessage(founderId, transcript, sessionId);
  }

  async getHistory(founderId: string, sessionId: string, limit = 50) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, founderId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: limit },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async listSessions(founderId: string) {
    return this.prisma.chatSession.findMany({
      where: { founderId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
  }

  /**
   * Stream a response token-by-token via SSE with intent routing.
   */
  streamMessage(founderId: string, content: string, sessionId?: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this._streamMessageAsync(subject, founderId, content, sessionId).catch((err) => {
      subject.next({ data: { error: err.message } } as MessageEvent);
      subject.complete();
    });

    return subject.asObservable();
  }

  private async _streamMessageAsync(
    subject: Subject<MessageEvent>,
    founderId: string,
    content: string,
    sessionId?: string,
  ) {
    let session;
    if (sessionId) {
      session = await this.prisma.chatSession.findFirst({ where: { id: sessionId, founderId } });
    }
    if (!session) {
      session = await this.prisma.chatSession.create({ data: { founderId, title: content.slice(0, 80) } });
    }

    subject.next({ data: { type: 'session', sessionId: session.id } } as MessageEvent);

    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'FOUNDER', content },
    });

    // Classify intent for streaming
    const intent = await this.classifyIntent(content);
    subject.next({ data: { type: 'intent', category: intent.category } } as MessageEvent);

    // Get context
    const context = await this.contextService.retrieveRelevant(founderId, content);

    // Build streaming prompt with intelligence context
    let systemPrompt = `You are Helm, an AI operating system for solo founders. Respond concisely and helpfully.`;

    if (intent.category !== 'general') {
      const engineHint = {
        marketing: 'The founder is asking about marketing. Provide expert marketing advice.',
        cashflow: 'The founder is asking about finances. Provide cashflow/financial analysis guidance.',
        competitor: 'The founder is asking about competitors. Provide competitive intelligence guidance.',
        support: 'The founder is asking about customer support. Provide support triage guidance.',
      }[intent.category];
      systemPrompt += ` ${engineHint}`;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: context.length > 0
        ? `Context:\n${context.join('\n')}\n\nFounder: ${content}`
        : content },
    ];

    let fullResponse = '';
    for await (const chunk of this.llm.stream(messages)) {
      if (chunk.done) {
        subject.next({ data: { type: 'done' } } as MessageEvent);
        break;
      }
      fullResponse += chunk.content;
      subject.next({ data: { type: 'chunk', content: chunk.content } } as MessageEvent);
    }

    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'AGENT',
        content: fullResponse,
        metadata: { streamed: true, intent: intent.category } as any,
      },
    });

    subject.complete();
  }
}
