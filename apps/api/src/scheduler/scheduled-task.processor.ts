import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { LLMService } from '../llm/llm.service.js';
import { EventBusService } from '../event/event-bus.service.js';

interface ScheduledTaskData {
  name: string;
  description: string;
  cron: string;
  layer: string;
  agentName: string;
  taskDescription: string;
  founderId?: string;
}

@Processor('scheduled-scans', {
  concurrency: 3,
})
export class ScheduledTaskProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledTaskProcessor.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private eventBus: EventBusService,
  ) {
    super();
  }

  async process(job: Job<ScheduledTaskData>): Promise<void> {
    const data = job.data;
    this.logger.log(`Running scheduled job: ${data.name}`);

    // Get all founders (or specific founder if custom job)
    const founders = data.founderId
      ? [{ id: data.founderId }]
      : await this.prisma.founder.findMany({ select: { id: true } });

    for (const founder of founders) {
      try {
        await this.runAgentTask(founder.id, data);
      } catch (err) {
        this.logger.error(`Failed scheduled task for founder ${founder.id}: ${err}`);
      }
    }

    this.logger.log(`Completed scheduled job: ${data.name} for ${founders.length} founders`);
  }

  private async runAgentTask(founderId: string, data: ScheduledTaskData): Promise<void> {
    // Find the agent
    const agent = await this.prisma.agent.findFirst({
      where: {
        founderId,
        name: data.agentName,
        layer: data.layer as any,
      },
    });

    if (!agent) {
      this.logger.debug(`Agent ${data.agentName} not found for founder ${founderId}, skipping`);
      return;
    }

    // Create a task
    const task = await this.prisma.task.create({
      data: {
        title: `[Scheduled] ${data.description}`,
        description: data.taskDescription,
        layer: data.layer as any,
        status: 'IN_PROGRESS',
        riskTier: 'AUTO_EXECUTE',
        assignedAgentId: agent.id,
        founderId,
      },
    });

    // Update agent status
    await this.prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'WORKING' },
    });

    try {
      // Execute with LLM
      const response = await this.llm.complete([
        {
          role: 'system',
          content: `You are "${agent.name}", a ${data.layer} layer agent in Helm. Run this scheduled task silently and produce a concise report.`,
        },
        {
          role: 'user',
          content: data.taskDescription,
        },
      ], { maxTokens: 1024 });

      // Complete the task
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          result: { report: response.content } as any,
          completedAt: new Date(),
        },
      });

      // Log activity
      await this.prisma.activityLogEntry.create({
        data: {
          founderId,
          agentId: agent.id,
          action: 'scheduled_task_completed',
          details: { taskId: task.id, jobName: data.name, report: response.content } as any,
          riskTier: 'AUTO_EXECUTE',
        },
      });

      // Emit event if significant findings
      if (response.content.length > 100) {
        await this.eventBus.publish({
          type: 'research.detected',
          publisherAgentId: agent.id,
          founderId,
          payload: { jobName: data.name, summary: response.content.slice(0, 200) },
        });
      }
    } catch (err) {
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'FAILED',
          error: err instanceof Error ? err.message : String(err),
        },
      });
    } finally {
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { status: 'IDLE' },
      });
    }
  }
}
