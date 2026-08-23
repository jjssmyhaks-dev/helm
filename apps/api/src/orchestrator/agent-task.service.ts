import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TaskStatus, RiskTier, AgentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { EventBusService } from '../event/event-bus.service.js';
import { RiskTierService } from '../approval/risk-tier.service.js';
import { ApprovalService } from '../approval/approval.service.js';
import { ContextService } from '../context/context.service.js';
import { TokenBudgetService } from '../queue/token-budget.service.js';
import { ComposioService } from '../connector/composio.service.js';
import { LLMService } from '../llm/llm.service.js';

interface CreateTaskInput {
  title: string;
  description: string;
  layer: string;
  assignedAgentId: string;
  riskTier: RiskTier;
  founderId: string;
  parentTaskId?: string;
}

@Injectable()
export class AgentTaskService {
  private readonly logger = new Logger(AgentTaskService.name);

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
    private riskTier: RiskTierService,
    private approvalService: ApprovalService,
    private contextService: ContextService,
    private tokenBudget: TokenBudgetService,
    private composio: ComposioService,
    private llm: LLMService,
  ) {}

  async createTask(input: CreateTaskInput) {
    return this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        layer: input.layer as any,
        assignedAgentId: input.assignedAgentId,
        riskTier: input.riskTier,
        founderId: input.founderId,
        parentId: input.parentTaskId ?? undefined,
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

  async executeTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignedAgent: true },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (!task.assignedAgentId) throw new NotFoundException('Task has no assigned agent');
    if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') return;

    await this.prisma.task.update({ where: { id: taskId }, data: { status: 'IN_PROGRESS' } });
    await this.prisma.agent.update({ where: { id: task.assignedAgentId }, data: { status: 'WORKING' } });

    await this.prisma.activityLogEntry.create({
      data: {
        founderId: task.founderId,
        agentId: task.assignedAgentId,
        action: 'task_started',
        details: { taskId, title: task.title } as unknown as Prisma.InputJsonValue,
        riskTier: task.riskTier,
      },
    });

    try {
      const budgetCheck = await this.tokenBudget.checkBudget(
        task.founderId, task.layer, task.assignedAgentId, 2000,
      );
      if (!budgetCheck.allowed) {
        this.logger.warn(`Token budget exceeded: ${budgetCheck.reason}`);
        await this.prisma.task.update({
          where: { id: taskId },
          data: { status: 'FAILED', error: `Budget exceeded: ${budgetCheck.reason}` },
        });
        return;
      }

      const context = await this.contextService.retrieveRelevant(task.founderId, task.description || task.title);
      const result = await this.executeWithLLM(task, context);

      if (result.tokenUsage) {
        await this.tokenBudget.recordUsage(task.founderId, {
          inputTokens: result.tokenUsage.inputTokens,
          outputTokens: result.tokenUsage.outputTokens,
          model: result.tokenUsage.model,
          agentId: task.assignedAgentId,
          layer: task.layer,
          taskId: task.id,
        });
      }

      const tierResult = await this.riskTier.classifyAction(
        task.founderId, task.layer, result.actionType || 'general',
        { confidence: result.confidence, isIrreversible: result.isIrreversible },
      );

      if (tierResult.tier === RiskTier.APPROVAL_REQUIRED) {
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
          data: { status: 'WAITING_APPROVAL' },
        });
        return;
      }

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          result: (result.data || {}) as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      if (result.contextUpdate) {
        await this.contextService.save(
          task.founderId, result.contextUpdate.key, result.contextUpdate.value, result.contextUpdate.tags || [],
        );
      }

      if (result.signal) {
        await this.eventBus.publish({
          type: result.signal.type,
          publisherAgentId: task.assignedAgentId,
          founderId: task.founderId,
          payload: result.signal.payload,
        });
      }

      await this.prisma.activityLogEntry.create({
        data: {
          founderId: task.founderId,
          agentId: task.assignedAgentId,
          action: 'task_completed',
          details: { taskId, title: task.title } as unknown as Prisma.InputJsonValue,
          riskTier: task.riskTier,
        },
      });
    } catch (err) {
      this.logger.error(`Task ${taskId} failed:`, err);
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          error: err instanceof Error ? err.message : String(err),
        },
      });
    } finally {
      await this.prisma.agent.update({ where: { id: task.assignedAgentId }, data: { status: 'IDLE' } });
    }
  }

  private async executeWithLLM(task: any, context: string[]) {
    const agent = task.assignedAgent;

    let toolsContext = '';
    try {
      const session = await this.composio.getSession(task.founderId);
      const tools = await session.tools();
      if (tools && tools.length > 0) {
        const toolList = tools.slice(0, 20).map((t: any) => `- ${t.name}: ${t.description || 'No description'}`).join('\n');
        toolsContext = `\n\nAvailable external tools (via Composio):\n${toolList}\nTo use a tool: { "useTool": { "action": "TOOL_NAME", "params": {} } }`;
      }
    } catch {
      // Composio not available
    }

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are "${agent.name}", a ${task.layer || 'global'} layer agent in Helm.
Execute this task. Output valid JSON:
{
  "data": { ... },
  "actionType": "general",
  "actionDescription": "What you did",
  "reasoning": "Why",
  "confidence": 0.85,
  "isIrreversible": false,
  "signal": null,
  "contextUpdate": { "key": "...", "value": "...", "tags": [] }
}${toolsContext}`,
      },
      {
        role: 'user',
        content: `Task: "${task.title}"
Description: "${task.description}"
Context: ${context.length > 0 ? context.join('; ') : 'None'}`,
      },
    ], { maxTokens: 2048, temperature: 0.4 });

    const tokenUsage = {
      inputTokens: 2000,
      outputTokens: 500,
      model: 'groq',
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.useTool && parsed.useTool.action) {
          try {
            const session = await this.composio.getSession(task.founderId);
            const toolResult = await session.execute(parsed.useTool.action, parsed.useTool.params || {});
            parsed.data = { ...parsed.data, toolResult };
          } catch (err) {
            this.logger.error(`Tool execution failed: ${err}`);
          }
        }
        return { ...parsed, tokenUsage };
      }
    } catch {
      // fall through
    }

    return {
      data: { result: response.content },
      actionType: 'general',
      actionDescription: task.title,
      reasoning: 'Direct execution',
      confidence: 0.7,
      isIrreversible: false,
      tokenUsage,
    };
  }

  async resumeTaskAfterApproval(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.status !== TaskStatus.IN_PROGRESS) return;
    await this.executeTask(taskId);
  }
}
