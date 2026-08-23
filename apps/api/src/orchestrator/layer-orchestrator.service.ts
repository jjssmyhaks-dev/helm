import { Injectable, Logger } from '@nestjs/common';
import { LayerName, AgentStatus } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../database/prisma.service.js';
import { EventBusService } from '../event/event-bus.service.js';
import { RiskTierService } from '../approval/risk-tier.service.js';
import { AgentTaskService } from './agent-task.service.js';

/** Sub-agents per layer for task assignment routing. */
const LAYER_SUB_AGENTS: Record<LayerName, string[]> = {
  RESEARCH: [
    'Competitor Intelligence',
    'Market & Trend Scanning',
    'Pricing & Benchmarking',
    'Customer & Audience Research',
    'Campaign Deep-Dive',
  ],
  MARKETING: [
    'Digital Marketing Strategist',
    'Performance Marketer',
    'Content & Copywriter',
    'SEO Specialist',
    'Designer',
    'Social & Community',
  ],
  OPERATIONS: [
    'Process & Workflow',
    'Vendor & Supply Chain',
    'Quality & Fulfillment',
    'Customer Support',
    'Scheduling & Capacity Planning',
  ],
  FINANCE: [
    'Bookkeeping',
    'Cash Flow & Forecasting',
    'Pricing & Unit Economics',
    'Compliance & Tax',
    'Fundraising & Investor Relations',
  ],
};

@Injectable()
export class LayerOrchestratorService {
  private readonly logger = new Logger(LayerOrchestratorService.name);
  private anthropic: Anthropic;

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
    private riskTier: RiskTierService,
    private agentTaskService: AgentTaskService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Handle a task routed from the Global Orchestrator.
   * Decomposes into sub-tasks and assigns to appropriate sub-agents.
   */
  async handleTask(founderId: string, layer: LayerName, description: string) {
    // Get the layer orchestrator agent
    const layerOrchestrator = await this.prisma.agent.findFirst({
      where: { founderId, layer, type: 'LAYER_ORCHESTRATOR' },
    });
    if (!layerOrchestrator) {
      this.logger.warn(`No layer orchestrator found for ${layer}`);
      return { tasks: [] };
    }

    // Update orchestrator status
    await this.prisma.agent.update({
      where: { id: layerOrchestrator.id },
      data: { status: 'WORKING' },
    });

    // Decompose into sub-tasks using LLM
    const decomposition = await this.decomposeTask(layer, description);

    const createdTasks: any[] = [];

    for (const subTask of decomposition) {
      // Find the best sub-agent for this sub-task
      const subAgent = await this.findSubAgent(founderId, layer, subTask.agentName);

      if (!subAgent) {
        this.logger.warn(`Sub-agent "${subTask.agentName}" not found in layer ${layer}`);
        continue;
      }

      // Classify the risk tier
      const tierResult = await this.riskTier.classifyAction(
        founderId,
        layer,
        subTask.actionType || 'general',
        { confidence: subTask.confidence },
      );

      // Create the task
      const task = await this.agentTaskService.createTask({
        title: subTask.title,
        description: subTask.description,
        layer,
        assignedAgentId: subAgent.id,
        riskTier: tierResult.tier,
        founderId,
      });

      // Start async execution
      this.agentTaskService.executeTask(task.id).catch((err) => {
        this.logger.error(`Task ${task.id} execution failed:`, err);
      });

      createdTasks.push(task);
    }

    // Reset layer orchestrator status
    await this.prisma.agent.update({
      where: { id: layerOrchestrator.id },
      data: { status: 'IDLE' },
    });

    return { tasks: createdTasks };
  }

  /**
   * Use LLM to decompose a layer task into sub-agent assignments.
   */
  private async decomposeTask(
    layer: LayerName,
    description: string,
  ): Promise<
    {
      title: string;
      description: string;
      agentName: string;
      actionType: string;
      confidence: number;
    }[]
  > {
    const availableAgents = LAYER_SUB_AGENTS[layer];

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are the ${layer} Layer Orchestrator for Helm.

Task to decompose: "${description}"

Available sub-agents:
${availableAgents.map((a) => `- ${a}`).join('\n')}

Break this task into 1-3 sub-tasks, each assigned to the most appropriate sub-agent. Only use agents that are relevant.

Respond with a JSON array:
[
  {
    "title": "Short task title",
    "description": "What this sub-agent should do",
    "agentName": "<exact agent name from the list>",
    "actionType": "general",
    "confidence": 0.85
  }
]

Keep it concise. Assign each sub-task to exactly one agent.`,
          },
        ],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      this.logger.error('Task decomposition failed', err);
    }

    // Fallback: assign to the first available sub-agent
    return [
      {
        title: description.slice(0, 100),
        description,
        agentName: availableAgents[0],
        actionType: 'general',
        confidence: 0.5,
      },
    ];
  }

  private async findSubAgent(founderId: string, layer: LayerName, agentName: string) {
    return this.prisma.agent.findFirst({
      where: {
        founderId,
        layer,
        type: 'SUB_AGENT',
        name: agentName,
      },
    });
  }
}
