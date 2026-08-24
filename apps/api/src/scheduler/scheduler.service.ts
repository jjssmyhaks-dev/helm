import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service.js';
import { EventBusService } from '../event/event-bus.service.js';
import { LLMService } from '../llm/llm.service.js';
import { SerpAPIService } from '../intelligence/serpapi.service.js';

interface ScheduledJob {
  name: string;
  description: string;
  cron: string;
  layer: string;
  agentName: string;
  taskDescription: string;
  enabled: boolean;
}

const DEFAULT_SCHEDULED_JOBS: ScheduledJob[] = [
  {
    name: 'competitor-scan',
    description: 'Daily competitor intelligence scan',
    cron: '0 9 * * *',
    layer: 'RESEARCH',
    agentName: 'Competitor Intelligence',
    taskDescription: 'Scan for competitor updates, pricing changes, product launches, and market positioning shifts.',
    enabled: true,
  },
  {
    name: 'market-trends',
    description: 'Daily market trend scan',
    cron: '0 10 * * *',
    layer: 'RESEARCH',
    agentName: 'Market & Trend Scanning',
    taskDescription: 'Scan industry news, search trends, and category shifts relevant to the business.',
    enabled: true,
  },
  {
    name: 'weekly-financial-review',
    description: 'Weekly financial health check',
    cron: '0 9 * * 1',
    layer: 'FINANCE',
    agentName: 'Cash Flow & Forecasting',
    taskDescription: 'Review the week\'s transactions, update cash flow forecast, check runway status.',
    enabled: true,
  },
  {
    name: 'seo-audit',
    description: 'Weekly SEO performance check',
    cron: '0 11 * * 1',
    layer: 'MARKETING',
    agentName: 'SEO Specialist',
    taskDescription: 'Check website SEO performance, keyword rankings, content gaps.',
    enabled: true,
  },
  {
    name: 'support-triage',
    description: 'Hourly support ticket check',
    cron: '0 * * * *',
    layer: 'OPERATIONS',
    agentName: 'Customer Support',
    taskDescription: 'Check for new customer support messages, triage and respond to common questions.',
    enabled: true,
  },
  {
    name: 'pricing-monitor',
    description: 'Daily pricing benchmark check',
    cron: '0 11 * * *',
    layer: 'RESEARCH',
    agentName: 'Pricing & Benchmarking',
    taskDescription: 'Monitor competitor pricing changes and benchmark against market averages.',
    enabled: true,
  },
];

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private jobStatus = new Map<string, { lastRun: Date | null; nextRun: Date | null; running: boolean; lastError: string | null }>();

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
    private llm: LLMService,
    private serpapi: SerpAPIService,
  ) {}

  onModuleInit() {
    // Initialize job status tracking
    for (const job of DEFAULT_SCHEDULED_JOBS) {
      this.jobStatus.set(job.name, {
        lastRun: null,
        nextRun: null,
        running: false,
        lastError: null,
      });
    }
    this.logger.log(`Scheduler initialized with ${DEFAULT_SCHEDULED_JOBS.length} cron jobs`);
    this.logger.log(`SerpAPI: ${this.serpapi.isConfigured() ? 'configured (live data)' : 'not configured (simulated)'}`);
  }

  /**
   * List all scheduled jobs with their status.
   */
  listJobs() {
    return DEFAULT_SCHEDULED_JOBS.map((j) => ({
      ...j,
      status: this.jobStatus.get(j.name),
    }));
  }

  /**
   * Manually trigger a job.
   */
  async triggerJob(jobName: string, founderId?: string): Promise<any> {
    const job = DEFAULT_SCHEDULED_JOBS.find((j) => j.name === jobName);
    if (!job) throw new Error(`Job "${jobName}" not found`);

    this.logger.log(`Manually triggering job: ${jobName}`);
    return this.executeJob(job, founderId);
  }

  /**
   * Toggle a job on/off.
   */
  toggleJob(jobName: string, enabled: boolean) {
    const job = DEFAULT_SCHEDULED_JOBS.find((j) => j.name === jobName);
    if (job) job.enabled = enabled;
    this.logger.log(`Job ${jobName} ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ─── Cron Jobs ────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleCompetitorScan() {
    await this.runIfEnabled('competitor-scan');
  }

  @Cron('0 10 * * *')
  async handleMarketTrends() {
    await this.runIfEnabled('market-trends');
  }

  @Cron('0 9 * * 1')
  async handleWeeklyFinancialReview() {
    await this.runIfEnabled('weekly-financial-review');
  }

  @Cron('0 11 * * 1')
  async handleSEOAudit() {
    await this.runIfEnabled('seo-audit');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleSupportTriage() {
    await this.runIfEnabled('support-triage');
  }

  @Cron('0 11 * * *')
  async handlePricingMonitor() {
    await this.runIfEnabled('pricing-monitor');
  }

  // ─── Job Execution ────────────────────────────────────────

  private async runIfEnabled(jobName: string) {
    const job = DEFAULT_SCHEDULED_JOBS.find((j) => j.name === jobName);
    if (!job?.enabled) return;
    await this.executeJob(job);
  }

  private async executeJob(job: ScheduledJob, founderId?: string) {
    const status = this.jobStatus.get(job.name);
    if (status?.running) {
      this.logger.warn(`Job ${job.name} already running, skipping`);
      return;
    }

    status!.running = true;
    status!.lastRun = new Date();
    status!.lastError = null;

    try {
      // Find all founders (or a specific one)
      const where = founderId ? { id: founderId } : {};
      const founders = await this.prisma.founder.findMany({ where });

      for (const founder of founders) {
        await this.processJobForFounder(job, founder.id);
      }

      this.logger.log(`Job ${job.name} completed for ${founders.length} founders`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.name} failed: ${msg}`);
      status!.lastError = msg;
    } finally {
      status!.running = false;
    }
  }

  private async processJobForFounder(job: ScheduledJob, founderId: string) {
    // Get founder context for personalized results
    const context = await this.prisma.founderContext.findUnique({
      where: { founderId },
    });

    const facts = (context?.facts as any[]) || [];
    const goals = (context?.goals as any[]) || [];
    const businessContext = [...facts, ...goals].map((f: any) => f.text || f.value || String(f)).join('; ');

    let jobResult: string;

    switch (job.name) {
      case 'competitor-scan':
        jobResult = await this.runCompetitorScan(founderId, businessContext);
        break;
      case 'market-trends':
        jobResult = await this.runMarketTrendScan(founderId, businessContext);
        break;
      case 'pricing-monitor':
        jobResult = await this.runPricingMonitor(founderId, businessContext);
        break;
      default:
        jobResult = await this.runGenericJob(job, founderId, businessContext);
    }

    // Publish event for the scan result
    await this.eventBus.publish({
      type: `scheduler.${job.name}.completed`,
      publisherAgentId: 'system',
      founderId,
      payload: { job: job.name, result: jobResult.slice(0, 500), timestamp: new Date().toISOString() },
    });

    // Create notification
    await this.prisma.notification.create({
      data: {
        founderId,
        type: 'scheduler',
        title: `Scheduled: ${job.description}`,
        message: jobResult.slice(0, 200),
        priority: 'normal',
        data: { job: job.name } as any,
      },
    });
  }

  // ─── Specific Job Implementations ─────────────────────────

  private async runCompetitorScan(founderId: string, context: string): Promise<string> {
    // Use SerpAPI for real data
    if (this.serpapi.isConfigured()) {
      const industry = context || 'Indian SaaS startup';
      const trends = await this.serpapi.researchMarketTrends(industry, 'India');

      const response = await this.llm.complete([
        {
          role: 'system',
          content: 'You are a competitor intelligence analyst. Analyze the following market data and provide a concise briefing. Focus on actionable insights.',
        },
        {
          role: 'user',
          content: `Industry: ${industry}\n\nRecent market trends:\n${trends.trends.map((t) => `- ${t.title}: ${t.snippet}`).join('\n')}\n\nRecent news:\n${trends.news.map((n) => `- ${n.title} (${n.date}, ${n.source})`).join('\n')}`,
        },
      ], { maxTokens: 1024 });

      return response.content;
    }

    // Fallback: generate simulated analysis
    const response = await this.llm.complete([
      {
        role: 'system',
        content: 'You are a competitor intelligence analyst. Generate a brief competitive landscape update. Be specific and actionable.',
      },
      {
        role: 'user',
        content: `Business context: ${context || 'Indian startup'}\n\nGenerate a brief competitor scan summary with 3 key observations.`,
      },
    ], { maxTokens: 512 });

    return response.content;
  }

  private async runMarketTrendScan(founderId: string, context: string): Promise<string> {
    if (this.serpapi.isConfigured()) {
      const industry = context || 'Indian startup';
      const [trends, news] = await Promise.all([
        this.serpapi.search(`${industry} market trends India 2025 2026`, { num: 5 }),
        this.serpapi.searchNews(`${industry} India latest news`, { num: 5 }),
      ]);

      const response = await this.llm.complete([
        {
          role: 'system',
          content: 'You are a market research analyst. Summarize the latest market trends and their implications for a startup founder.',
        },
        {
          role: 'user',
          content: `Industry: ${industry}\n\nSearch results:\n${trends.results.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')}\n\nNews:\n${news.articles.map((a) => `- ${a.title} (${a.date})`).join('\n')}`,
        },
      ], { maxTokens: 1024 });

      return response.content;
    }

    const response = await this.llm.complete([
      {
        role: 'system',
        content: 'You are a market research analyst. Generate a brief market trend update.',
      },
      {
        role: 'user',
        content: `Industry: ${context || 'Indian startup'}. Generate 3 key market trends and their implications.`,
      },
    ], { maxTokens: 512 });

    return response.content;
  }

  private async runPricingMonitor(founderId: string, context: string): Promise<string> {
    if (this.serpapi.isConfigured()) {
      const search = await this.serpapi.search(
        `${context || 'SaaS'} pricing plans comparison India`,
        { num: 5 },
      );

      const response = await this.llm.complete([
        {
          role: 'system',
          content: 'You are a pricing analyst. Analyze competitor pricing data and provide insights.',
        },
        {
          role: 'user',
          content: `Pricing data:\n${search.results.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')}`,
        },
      ], { maxTokens: 512 });

      return response.content;
    }

    return `Pricing monitor: SerpAPI not configured. Set SERPAPI_KEY for live competitor pricing data.`;
  }

  private async runGenericJob(job: ScheduledJob, founderId: string, context: string): Promise<string> {
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are the "${job.agentName}" agent. Execute this scheduled task and provide a brief summary.`,
      },
      {
        role: 'user',
        content: `Task: ${job.taskDescription}\nBusiness context: ${context || 'Not specified'}`,
      },
    ], { maxTokens: 512 });

    return response.content;
  }
}
