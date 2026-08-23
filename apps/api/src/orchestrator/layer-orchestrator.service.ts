import { Injectable, Logger } from '@nestjs/common';
import { AgentLayer } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { EventBusService } from '../event/event-bus.service.js';
import { RiskTierService } from '../approval/risk-tier.service.js';
import { AgentTaskService } from './agent-task.service.js';
import { LLMService } from '../llm/llm.service.js';

const LAYER_SUB_AGENTS: Record<AgentLayer, string[]> = {
  RESEARCH: ['Competitor Intelligence', 'Market & Trend Scanning', 'Pricing & Benchmarking', 'Customer & Audience Research', 'Campaign Deep-Dive'],
  MARKETING: ['Digital Marketing Strategist', 'Performance Marketer', 'Content & Copywriter', 'SEO Specialist', 'Designer', 'Social & Community'],
  OPERATIONS: ['Process & Workflow', 'Vendor & Supply Chain', 'Quality & Fulfillment', 'Customer Support', 'Scheduling & Capacity Planning'],
  FINANCE: ['Bookkeeping', 'Cash Flow & Forecasting', 'Pricing & Unit Economics', 'Compliance & Tax', 'Fundraising & Investor Relations'],
};

@Injectable()
export class LayerOrchestratorService {
  private readonly logger = new Logger(LayerOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
    private riskTier: RiskTierService,
    private agentTaskService: AgentTaskService,
    private llm: LLMService,
  ) {}

  async handleTask(founderId: string, layer: AgentLayer, description: string) {
    const layerOrchestrator = await this.prisma.agent.findFirst({
      where: { founderId, layer, role: 'orchestrator' },
    });
    if (!layerOrchestrator) {
      this.logger.warn(`No layer orchestrator found for ${layer}`);
      return { tasks: [] };
    }

    await this.prisma.agent.update({
      where: { id: layerOrchestrator.id },
      data: { status: 'WORKING' },
    });

    const decomposition = await this.decomposeTask(layer, description);
    const createdTasks: any[] = [];

    for (const subTask of decomposition) {
      const subAgent = await this.findSubAgent(founderId, layer, subTask.agentName);
      if (!subAgent) {
        this.logger.warn(`Sub-agent "${subTask.agentName}" not found in ${layer}`);
        continue;
      }

      const tierResult = await this.riskTier.classifyAction(founderId, layer, subTask.actionType || 'general', {
        confidence: subTask.confidence,
      });

      const task = await this.agentTaskService.createTask({
        title: subTask.title,
        description: subTask.description,
        layer,
        assignedAgentId: subAgent.id,
        riskTier: tierResult.tier,
        founderId,
      });

      this.agentTaskService.executeTask(task.id).catch((err) => {
        this.logger.error(`Task ${task.id} execution failed:`, err);
      });

      createdTasks.push(task);
    }

    await this.prisma.agent.update({
      where: { id: layerOrchestrator.id },
      data: { status: 'IDLE' },
    });

    return { tasks: createdTasks };
  }

  private async decomposeTask(layer: AgentLayer, description: string) {
    const availableAgents = LAYER_SUB_AGENTS[layer];

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are the ${layer} Layer Orchestrator. Break this task into 1-3 sub-tasks.
Output valid JSON array:
[{"title": "...", "description": "...", "agentName": "<exact name from list>", "actionType": "general", "confidence": 0.85}]`,
      },
      {
        role: 'user',
        content: `Task: "${description}"
Available agents: ${availableAgents.join(', ')}`,
      },
    ], { maxTokens: 1024, temperature: 0.3 });

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {
      // fall through
    }

    return [{
      title: description.slice(0, 100),
      description,
      agentName: availableAgents[0],
      actionType: 'general',
      confidence: 0.5,
    }];
  }

  private async findSubAgent(founderId: string, layer: AgentLayer, agentName: string) {
    return this.prisma.agent.findFirst({
      where: { founderId, layer, name: agentName },
    });
  }
}
