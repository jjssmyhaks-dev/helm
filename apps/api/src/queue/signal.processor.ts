import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

export interface SignalJobData {
  type: string;
  publisherAgentId: string;
  founderId: string;
  payload: Record<string, unknown>;
}

@Processor('signal-processing', {
  concurrency: 5,
})
export class SignalProcessor extends WorkerHost {
  private readonly logger = new Logger(SignalProcessor.name);
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    super();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Process a signal job — find all subscribers and route the signal to them.
   * This runs durably in BullMQ with retry on failure.
   */
  async process(job: Job<SignalJobData>): Promise<void> {
    const { type, publisherAgentId, founderId, payload } = job.data;

    this.logger.log(`Processing signal: ${type} (job ${job.id})`);

    // Find all agents subscribed to this signal type for this founder
    const subscriptions = await this.prisma.eventSubscription.findMany({
      where: { founderId, signalType: type },
      include: {
        agent: {
          select: { id: true, name: true, layer: true, status: true },
        },
      },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No subscribers for signal ${type} on founder ${founderId}`);
      return;
    }

    this.logger.log(`Signal ${type} has ${subscriptions.length} subscribers`);

    // Process each subscriber
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        this.processSubscriber(sub, { type, publisherAgentId, founderId, payload }),
      ),
    );

    // Log summary
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    this.logger.log(`Signal ${type} processed: ${succeeded} succeeded, ${failed} failed`);

    // If all failed, throw to trigger BullMQ retry
    if (failed > 0 && succeeded === 0) {
      throw new Error(
        `All ${failed} subscribers failed for signal ${type}. Last error: ${
          results.find((r) => r.status === 'rejected') &&
          (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason
        }`,
      );
    }
  }

  /**
   * Process a signal for a single subscriber agent.
   * Creates a task for the agent to handle the signal.
   */
  private async processSubscriber(
    subscription: any,
    signal: SignalJobData,
  ): Promise<void> {
    const agent = subscription.agent;

    // Skip offline or error agents
    if (agent.status === 'OFFLINE' || agent.status === 'ERROR') {
      this.logger.debug(`Skipping agent ${agent.name} (status: ${agent.status})`);
      return;
    }

    // Create a task for the agent to process this signal
    const task = await this.prisma.task.create({
      data: {
        title: `Handle signal: ${signal.type}`,
        description: this.buildSignalDescription(signal),
        layer: agent.layer || 'RESEARCH',
        status: 'PENDING',
        riskTier: 'NOTIFY_AND_ACT',
        assignedAgentId: agent.id,
        founderId: signal.founderId,
      },
    });

    // Use LLM to determine what the agent should do with this signal
    const action = await this.determineAgentAction(agent, signal);

    if (action.skipAgent) {
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          result: { skipped: true, reason: action.reason },
          completedAt: new Date(),
        },
      });
      return;
    }

    // Update task with the determined action
    await this.prisma.task.update({
      where: { id: task.id },
      data: {
        description: action.description || task.description,
      },
    });

    this.logger.log(`Created task ${task.id} for agent ${agent.name} to handle signal ${signal.type}`);
  }

  private buildSignalDescription(signal: SignalJobData): string {
    const payloadStr = Object.entries(signal.payload)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    return `Signal "${signal.type}" published. Payload: {${payloadStr}}. Respond appropriately based on your role.`;
  }

  private async determineAgentAction(
    agent: any,
    signal: SignalJobData,
  ): Promise<{ description?: string; skipAgent: boolean; reason?: string }> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `You are "${agent.name}", a ${agent.layer || 'global'} layer agent in Helm.

A cross-layer signal was just published:
Type: ${signal.type}
Payload: ${JSON.stringify(signal.payload)}

Should this agent take action based on this signal? If yes, briefly describe what it should do (1 sentence). If no, say SKIP.

Respond with JSON: { "skipAgent": boolean, "description": "...", "reason": "..." }`,
          },
        ],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      this.logger.error(`Failed to determine agent action: ${err}`);
    }

    return { skipAgent: false };
  }
}
