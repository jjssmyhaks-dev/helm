import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentToolConnectorService } from '../connector/agent-tool-connector.service.js';
import { PrismaService } from '../database/prisma.service.js';

export interface AgentCapability {
  name: string;
  description: string;
  examples: string[];
}

export interface AgentResult {
  agentName: string;
  response: string;
  toolCalls?: Array<{ tool: string; input: any; output: any }>;
  suggestions?: string[];
  confidence: number;
}

export interface SpecialistAgent {
  name: string;
  layer: string;
  capabilities: AgentCapability[];
  canHandle(intent: string, params: Record<string, string>): boolean;
  execute(founderId: string, intent: string, params: Record<string, string>, message: string): Promise<AgentResult>;
}

/**
 * Agent Orchestrator — routes requests to the right specialist agent.
 * Uses LLM-based intent classification when ambiguous, and delegates
 * to the best-matching specialist agent for execution.
 */
@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private agents: SpecialistAgent[] = [];

  constructor(
    private llm: LLMService,
    private toolConnector: AgentToolConnectorService,
    private prisma: PrismaService,
  ) {}

  /** Register a specialist agent */
  registerAgent(agent: SpecialistAgent) {
    this.agents.push(agent);
    this.logger.log(`Registered agent: ${agent.name} (${agent.layer})`);
  }

  /** Get all registered agents */
  getAgents(): Array<{ name: string; layer: string; capabilities: AgentCapability[] }> {
    return this.agents.map((a) => ({
      name: a.name,
      layer: a.layer,
      capabilities: a.capabilities,
    }));
  }

  /**
   * Route a message to the best specialist agent.
   * Falls back to LLM general response if no agent matches.
   */
  async route(
    founderId: string,
    message: string,
    intent?: string,
    params?: Record<string, string>,
  ): Promise<AgentResult> {
    // Try to find a matching agent
    const matchingAgent = this.agents.find((a) =>
      a.canHandle(intent || message, params || {}),
    );

    if (matchingAgent) {
      this.logger.log(`Routing to ${matchingAgent.name}`);
      try {
        return await matchingAgent.execute(founderId, intent || message, params || {}, message);
      } catch (err: any) {
        this.logger.error(`Agent ${matchingAgent.name} failed: ${err.message}`);
        return this.generalResponse(founderId, message);
      }
    }

    // No specific agent matched — use general LLM response with tool suggestions
    return this.generalResponse(founderId, message);
  }

  /** General LLM response with optional tool suggestions */
  private async generalResponse(founderId: string, message: string): Promise<AgentResult> {
    // Get available tools for context
    const tools = await this.toolConnector.getAvailableTools(founderId);
    const toolList = tools.slice(0, 20).map((t: any) => `- ${t.name}: ${t.description}`).join('\n');

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are Helm, an AI operating system for solo founders.
You have specialist agents for: writing, finance, marketing, SEO, project management, and more.
You can also use connected tools via Composio.

Available connected tools:
${toolList || 'No tools connected yet. Tell the user to connect tools in Settings.'}

Respond concisely and helpfully. If the user's request would benefit from a specialist agent, suggest it.`,
      },
      { role: 'user', content: message },
    ], { maxTokens: 1024, temperature: 0.5 });

    return {
      agentName: 'general',
      response: response.content,
      confidence: 0.6,
    };
  }
}
