import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentToolConnectorService } from '../connector/agent-tool-connector.service.js';

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
 * Agent Orchestrator — routes requests to specialist agents via a registry.
 * Agents self-register; routing is first-match by canHandle().
 * Falls back to general LLM response when no agent matches.
 */
@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private readonly registry: SpecialistAgent[] = [];

  constructor(
    private llm: LLMService,
    private toolConnector: AgentToolConnectorService,
  ) {}

  /** Register one or more specialist agents. */
  register(...agents: SpecialistAgent[]) {
    for (const agent of agents) {
      this.registry.push(agent);
      this.logger.log(`Registered: ${agent.name} (${agent.layer})`);
    }
  }

  /** List all registered agents with their capabilities. */
  getAgents(): Array<{ name: string; layer: string; capabilities: AgentCapability[] }> {
    return this.registry.map((a) => ({ name: a.name, layer: a.layer, capabilities: a.capabilities }));
  }

  /** Find the best-matching agent for a message. Returns null if none match. */
  findAgent(message: string, params: Record<string, string> = {}): SpecialistAgent | null {
    return this.registry.find((a) => a.canHandle(message, params)) ?? null;
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
    const candidate = intent
      ? this.registry.find((a) => a.canHandle(intent, params || {}))
      : this.findAgent(message, params || {});

    if (candidate) {
      this.logger.log(`Routing to ${candidate.name}`);
      try {
        return await candidate.execute(founderId, intent || message, params || {}, message);
      } catch (err: any) {
        this.logger.error(`Agent ${candidate.name} failed: ${err.message}`);
        return this.generalResponse(founderId, message);
      }
    }

    return this.generalResponse(founderId, message);
  }

  /** General LLM response with tool suggestions when no specialist matches. */
  private async generalResponse(founderId: string, message: string): Promise<AgentResult> {
    const tools = await this.toolConnector.getAvailableTools(founderId);
    const toolList = tools.slice(0, 20).map((t: any) => `- ${t.name}: ${t.description}`).join('\n');

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are Helm, an AI operating system for solo founders.
Specialist agents: ${this.registry.map((a) => a.name).join(', ')}.
Available connected tools:\n${toolList || 'No tools connected yet.'}
Respond concisely. If a specialist agent fits better, suggest it.`,
      },
      { role: 'user', content: message },
    ], { maxTokens: 1024, temperature: 0.5 });

    return { agentName: 'general', response: response.content, confidence: 0.6 };
  }
}
