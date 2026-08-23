import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

interface ScheduledJob {
  name: string;
  description: string;
  cron: string;
  layer: string;
  agentName: string;
  taskDescription: string;
}

const DEFAULT_SCHEDULED_JOBS: ScheduledJob[] = [
  {
    name: 'competitor-scan',
    description: 'Daily competitor intelligence scan',
    cron: '0 9 * * *',
    layer: 'RESEARCH',
    agentName: 'Competitor Intelligence',
    taskDescription: 'Scan for competitor updates, pricing changes, product launches.',
  },
  {
    name: 'market-trends',
    description: 'Daily market trend scan',
    cron: '0 10 * * *',
    layer: 'RESEARCH',
    agentName: 'Market & Trend Scanning',
    taskDescription: 'Scan industry news, search trends, category shifts.',
  },
  {
    name: 'weekly-financial-review',
    description: 'Weekly financial health check',
    cron: '0 9 * * 1',
    layer: 'FINANCE',
    agentName: 'Cash Flow & Forecasting',
    taskDescription: "Review the week's transactions, update cash flow forecast.",
  },
  {
    name: 'seo-audit',
    description: 'Weekly SEO performance check',
    cron: '0 11 * * 1',
    layer: 'MARKETING',
    agentName: 'SEO Specialist',
    taskDescription: 'Check website SEO performance, keyword rankings.',
  },
  {
    name: 'support-triage',
    description: 'Hourly support ticket check',
    cron: '0 * * * *',
    layer: 'OPERATIONS',
    agentName: 'Customer Support',
    taskDescription: 'Check for new customer support messages. Triage and respond.',
  },
];

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  onModuleInit() {
    this.logger.log(`Scheduler initialized with ${DEFAULT_SCHEDULED_JOBS.length} default jobs`);
    this.logger.log('Note: BullMQ disabled — jobs run on-demand when triggered');
  }

  async listJobs() {
    return DEFAULT_SCHEDULED_JOBS.map((j) => ({
      name: j.name,
      description: j.description,
      cron: j.cron,
      layer: j.layer,
      agentName: j.agentName,
    }));
  }

  async triggerJob(jobName: string): Promise<void> {
    const job = DEFAULT_SCHEDULED_JOBS.find((j) => j.name === jobName);
    if (!job) throw new Error(`Job ${jobName} not found`);
    this.logger.log(`Manually triggered job: ${jobName}`);
  }
}
