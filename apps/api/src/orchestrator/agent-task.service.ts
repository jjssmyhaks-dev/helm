import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TaskStatus, RiskTier, AgentStatus, Prisma } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../database/prisma.service.js';
import { EventBusService } from '../event/event-bus.service.js';
import { RiskTierService, TierClassification } from '../approval/risk-tier.service.js';
import { ApprovalService } from '../approval/approval.service.js';
import { ContextService } from '../context/context.service.js';

interface CreateTaskInput {
  title: string;
  description: string;
  layer: any;
  assignedAgentId: string;
  riskTier: RiskTier;
  founderId: string;
  parentTaskId?: string;
}

@Injectable()
export class AgentTaskService {
  private readonly logger = new Logger(AgentTaskService.name);
  private anthropic: Anthropic;

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
    private riskTier: RiskTierService,
    private approvalService: ApprovalService,
    private contextService: ContextService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async createTask(input: CreateTaskInput) {
    return this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        layer: input.layer,
        assignedAgentId: input.assignedAgentId,
        riskTier: input.riskTier,
        founderId: input.founderId,
        parentTaskId: input.parentTaskId ?? null,
      },
      include: {
        assignedAgent: { select: { id: true, name: true, layer: true } },
      },
    });
  }

  async getTask(taskId: string) {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedAgent: { select: { id: true, name: true, layer: true } },
        approval: true,
        subTasks: true,
      },
    });
  }

  async getTasksByFounder(founderId: string, status?: TaskStatus) {
    return this.prisma.task.findMany({
      where: { founderId, ...(status ? { status } : {}) },
      include: {
        assignedAgent: { select: { id: true, name: true, layer: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getTasksByAgent(agentId: string) {
    return this.prisma.task.findMany({
      where: { assignedAgentId: agentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Execute a task - the core agent execution loop.
   * 1. Mark agent as working
   * 2. Use LLM to process the task
   * 3. Check risk tier and handle accordingly
   * 4. Emit events and update context
   */
  async executeTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedAgent: true,
        parentTask: true,
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') {
      return; // Already executed or cancelled
    }

    // Update statuses
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.IN_PROGRESS },
    });
    await this.prisma.agent.update({
      where: { id: task.assignedAgentId },
      data: { status: AgentStatus.WORKING },
    });

    // Log activity
    await this.prisma.activityLogEntry.create({
      data: {
        founderId: task.founderId,
        agentId: task.assignedAgentId,
        action: 'task_started',
        details: { taskId, title: task.title },
        riskTier: task.riskTier,
      },
    });

    try {
      // Retrieve relevant context
      const context = await this.contextService.retrieveRelevant(
        task.founderId,
        task.description,
      );

      // Execute with LLM
      const result = await this.executeWithLLM(task, context);

      // Check if this action needs approval (re-classify with execution context)
      const tierResult = await this.riskTier.classifyAction(
        task.founderId,
        task.layer,
        result.actionType || 'general',
        {
          confidence: result.confidence,
          isIrreversible: result.isIrreversible,
        },
      );

      if (tierResult.tier === RiskTier.APPROVAL_REQUIRED) {
        // Create approval request - agent persists state and continues
        await this.approvalService.createApprovalRequest({
          taskId: task.id,
          agentId: task.assignedAgentId,
          founderId: task.founderId,
          actionDescription: result.actionDescription || task.title,
          actionPayload: result.data || {},
          reasoning: result.reasoning || 'Action requires founder approval',
          riskTier: RiskTier.APPROVAL_REQUIRED,
        });

        await this.prisma.agent.update({
          where: { id: task.assignedAgentId },
          data: { status: AgentStatus.WAITING_APPROVAL },
        });

        return;
      }

      // Tier 1 or 2: complete the task
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.COMPLETED,
          result: (result.data || {}) as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      // Save to context memory
      if (result.contextUpdate) {
        await this.contextService.save(
          task.founderId,
          result.contextUpdate.key,
          result.contextUpdate.value,
          result.contextUpdate.tags || [],
        );
      }

      // Emit event if the task produces a signal
      if (result.signal) {
        await this.eventBus.publish({
          type: result.signal.type,
          publisherAgentId: task.assignedAgentId,
          founderId: task.founderId,
          payload: result.signal.payload,
        });
      }

      // Log completion
      await this.prisma.activityLogEntry.create({
        data: {
          founderId: task.founderId,
          agentId: task.assignedAgentId,
          action: 'task_completed',
          details: { taskId, title: task.title, result: result.data } as unknown as Prisma.InputJsonValue,
          riskTier: task.riskTier,
        },
      });
    } catch (err) {
      this.logger.error(`Task ${taskId} execution failed:`, err);
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.FAILED,
          error: err instanceof Error ? err.message : String(err),
        },
      });
      await this.prisma.activityLogEntry.create({
        data: {
          founderId: task.founderId,
          agentId: task.assignedAgentId,
          action: 'task_failed',
          details: { taskId, error: err instanceof Error ? err.message : String(err) },
          riskTier: task.riskTier,
        },
      });
    } finally {
      await this.prisma.agent.update({
        where: { id: task.assignedAgentId },
        data: { status: AgentStatus.IDLE },
      });
    }
  }

  private async executeWithLLM(
    task: any,
    context: string[],
  ): Promise<{
    data: Record<string, unknown>;
    actionType: string;
    actionDescription: string;
    reasoning: string;
    confidence: number;
    isIrreversible: boolean;
    signal?: { type: string; payload: Record<string, unknown> };
    contextUpdate?: { key: string; value: string; tags: string[] };
  }> {
    const agent = task.assignedAgent;
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are "${agent.name}", a specialist AI agent in the ${agent.layer || 'global'} layer of Helm, an AI operating system for solo founders.

Your task: "${task.title}"
Description: "${task.description}"

Relevant context:
${context.length > 0 ? context.map((c) => `- ${c}`).join('\n') : 'No prior context.'}

Execute this task. Produce a result as a JSON object:
{
  "data": { ... your work output ... },
  "actionType": "general",
  "actionDescription": "Brief description of what you did",
  "reasoning": "Why you took this approach",
  "confidence": 0.85,
  "isIrreversible": false,
  "signal": null,
  "contextUpdate": { "key": "some_key", "value": "what you learned", "tags": ["tag1"] }
}

If your work produces a cross-layer signal (e.g., marketing detects underperforming leads, ops detects delay), include it in "signal" with the correct type and payload.
If you learned something important for future decisions, include a "contextUpdate" to save to memory.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      data: { result: text },
      actionType: 'general',
      actionDescription: task.title,
      reasoning: 'Direct execution',
      confidence: 0.7,
      isIrreversible: false,
    };
  }

  /**
   * Called when an approval is resolved to continue task execution.
   */
  async resumeTaskAfterApproval(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.status !== TaskStatus.IN_PROGRESS) return;

    // Task is back in progress - the approval handler already updated it
    // Re-execute with the updated state
    await this.executeTask(taskId);
  }
}
