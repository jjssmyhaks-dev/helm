import { Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentCapability, AgentResult, SpecialistAgent } from './agent-orchestrator.service.js';

/**
 * Configuration for a specialist agent.
 * Subclasses provide this static config — the base class handles all the plumbing.
 */
export interface AgentConfig {
  name: string;
  layer: string;
  capabilities: AgentCapability[];
  /** Keywords that trigger this agent (case-insensitive substring match) */
  intentKeywords: string[];
  /** System prompt sent to the LLM. Use {message} placeholder for the user's input. */
  systemPrompt: string;
  /** LLM temperature (default: 0.5) */
  temperature?: number;
  /** Max tokens for LLM response (default: 2048) */
  maxTokens?: number;
}

/**
 * Abstract base class for specialist agents.
 * Eliminates ~800 lines of duplicated boilerplate across 8 agents.
 *
 * Subclasses only need to:
 * 1. Define a static `config` object with prompt, keywords, capabilities
 * 2. Optionally override `formatResponse()` for custom markdown rendering
 * 3. Optionally override `beforeLLM()` for pre-processing (e.g., tool calls)
 */
export abstract class AgentBase implements SpecialistAgent {
  protected readonly logger: Logger;

  abstract readonly name: string;
  abstract readonly layer: string;
  abstract readonly capabilities: AgentCapability[];

  protected constructor(
    protected readonly llm: LLMService,
    protected readonly config: AgentConfig,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  canHandle(intent: string, _params: Record<string, string>): boolean {
    const lower = intent.toLowerCase();
    return this.config.intentKeywords.some((k) => lower.includes(k));
  }

  async execute(
    founderId: string,
    _intent: string,
    _params: Record<string, string>,
    message: string,
  ): Promise<AgentResult> {
    // Pre-processing hook (tool calls, context loading, etc.)
    const toolCalls = await this.beforeLLM(founderId, message);

    // Build the system prompt, allowing subclass to inject dynamic context
    const systemPrompt = await this.buildSystemPrompt(founderId, message);

    // Call LLM
    const response = await this.llm.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      {
        maxTokens: this.config.maxTokens ?? 2048,
        temperature: this.config.temperature ?? 0.5,
      },
    );

    // Parse and format
    return this.parseAndFormat(response.content, toolCalls);
  }

  /**
   * Build the system prompt. Override to inject dynamic context (e.g., founder info).
   */
  protected async buildSystemPrompt(_founderId: string, _message: string): Promise<string> {
    return this.config.systemPrompt;
  }

  /**
   * Pre-LLM hook. Override to make tool calls (Composio, DB lookups, etc.)
   * Return an array of tool call records to include in the result.
   */
  protected async beforeLLM(
    _founderId: string,
    _message: string,
  ): Promise<AgentResult['toolCalls']> {
    return [];
  }

  /**
   * Format the parsed LLM JSON into markdown. Override for custom rendering.
   * Default implementation: dumps the JSON analysis field.
   */
  protected formatResponse(parsed: Record<string, any>, _message: string): string {
    // Default: render the first markdown-looking field
    const mdFields = ['analysis', 'strategy', 'plan', 'content', 'response'];
    for (const field of mdFields) {
      if (parsed[field]) return String(parsed[field]);
    }
    // Fallback: JSON block
    return '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
  }

  /**
   * Parse LLM response JSON and format into AgentResult.
   */
  private async parseAndFormat(
    content: string,
    toolCalls: AgentResult['toolCalls'],
  ): Promise<AgentResult> {
    try {
      const parsed = JSON.parse(content);
      const response = this.formatResponse(parsed, '');
      const suggestions = parsed.suggestions || parsed.recommendations || parsed.nextSteps || [];
      return {
        agentName: this.name,
        response,
        toolCalls,
        suggestions: Array.isArray(suggestions) ? suggestions : [],
        confidence: 0.85,
      };
    } catch {
      return {
        agentName: this.name,
        response: content,
        toolCalls,
        confidence: 0.7,
      };
    }
  }
}
