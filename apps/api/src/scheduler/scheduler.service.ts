import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';

interface ScheduledJob {
  name: string;
  description: string;
  cron: string;
  layer: string;
  agentName: string;
  taskDescription: string;
}

/**
 * Default scheduled jobs for proactive agent behavior.
 * These run in the background without founder interaction.
 */
const DEFAULT_SCHEDULED_JOBS: ScheduledJob[] = [
  {
    name: 'competitor-scan',
    description: 'Daily competitor intelligence scan',
    cron: '0 9 * * *', // 9 AM daily
    layer: 'RESEARCH',
    agentName: 'Competitor Intelligence',
    taskDescription: 'Scan for any competitor updates, pricing changes, product launches, or positioning shifts in the last 24 hours. Summarize findings.',
  },
  {
    name: 'market-trends',
    description: 'Daily market trend scan',
    cron: '0 10 * * *', // 10 AM daily
    layer: 'RESEARCH',
    agentName: 'Market & Trend Scanning',
    taskDescription: 'Scan industry news, search trends, and category shifts relevant to our business. Report any significant changes.',
  },
  {
    name: 'weekly-financial-review',
    description: 'Weekly financial health check',
    cron: '0 9 * * 1', // Monday 9 AM
    layer: 'FINANCE',
    agentName: 'Cash Flow & Forecasting',
    taskDescription: 'Review the week\'s transactions, update cash flow forecast, and flag any budget concerns or anomalies.',
  },
  {
    name: 'seo-audit',
    description: 'Weekly SEO performance check',
    cron: '0 11 * * 1', // Monday 11 AM
    layer: 'MARKETING',
    agentName: 'SEO Specialist',
    taskDescription: 'Check website SEO performance, keyword rankings, and content gaps. Identify quick wins.',
  },
  {
    name: 'support-triage',
    description: 'Hourly support ticket check',
    cron: '0 * * * *', // Every hour
    layer: 'OPERATIONS',
    agentName: 'Customer Support',
    taskDescription: 'Check for new customer support messages. Triage and respond to FAQs. Escalate urgent issues.',
  },
];

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('scheduled-scans') private scheduledQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.setupDefaultJobs();
    this.logger.log('Scheduler initialized with default jobs');
  }

  /**
   * Set up all default scheduled jobs.
   */
  private async setupDefaultJobs(): Promise<void> {
    for (const job of DEFAULT_SCHEDULED_JOBS) {
      // Remove existing repeatable job with same name
      const existingJobs = await this.scheduledQueue.getJobSchedulers();
      for (const existing of existingJobs) {
        if (existing.name === job.name) {
          await this.scheduledQueue.removeJobScheduler(existing.id);
        }
      }

      // Add new repeatable job
      await this.scheduledQueue.add(
        job.name,
        {
          ...job,
        },
        {
          jobId: `scheduled-${job.name}`,
          repeat: {
            pattern: job.cron,
          },
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 604800 },
        },
      );

      this.logger.log(`Scheduled job: ${job.name} (${job.cron})`);
    }
  }

  /**
   * Add a custom scheduled job for a specific founder.
   */
  async addCustomJob(
    founderId: string,
    job: Omit<ScheduledJob, 'name'> & { name: string },
  ): Promise<void> {
    const jobId = `custom-${founderId}-${job.name}`;

    await this.scheduledQueue.add(
      jobId,
      {
        ...job,
        founderId,
      },
      {
        jobId,
        repeat: {
          pattern: job.cron,
        },
      },
    );

    this.logger.log(`Custom scheduled job: ${job.name} for founder ${founderId}`);
  }

  /**
   * Remove a custom scheduled job.
   */
  async removeCustomJob(founderId: string, jobName: string): Promise<void> {
    const jobId = `custom-${founderId}-${jobName}`;
    await this.scheduledQueue.removeJobScheduler(jobId);
  }

  /**
   * List all scheduled jobs for a founder.
   */
  async listJobs(founderId: string) {
    const jobs = await this.scheduledQueue.getJobSchedulers();
    return jobs.filter((j) => j.name?.includes(founderId) || j.name?.startsWith('scheduled-'));
  }

  /**
   * Manually trigger a scheduled job (for testing).
   */
  async triggerJob(jobName: string): Promise<void> {
    const job = DEFAULT_SCHEDULED_JOBS.find((j) => j.name === jobName);
    if (!job) throw new Error(`Job ${jobName} not found`);

    await this.scheduledQueue.add(`manual-${jobName}`, job, {
      attempts: 1,
    });
  }
}
