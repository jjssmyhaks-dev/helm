import { Injectable, Logger } from '@nestjs/common';
import { ComposioService } from './composio.service.js';
import { LLMService } from '../llm/llm.service.js';

export interface ToolSuggestion {
  toolName: string;
  appName: string;
  description: string;
  relevance: number;
}

export interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  result?: unknown;
  error?: string;
}

@Injectable()
export class AgentToolConnectorService {
  private readonly logger = new Logger(AgentToolConnectorService.name);

  constructor(
    private composio: ComposioService,
    private llm: LLMService,
  ) {}

  /**
   * Get all tools available to a founder through Composio.
   */
  async getAvailableTools(founderId: string) {
    try {
      const tools = await this.composio.getToolsForFounder(founderId);
      return tools.map((tool: any) => ({
        name: tool.name,
        displayName: this.formatName(tool.name),
        description: tool.description || '',
        appName: tool.appName || tool.name?.split('_')[0],
        inputParams: tool.inputParams || {},
        outputParams: tool.outputParams || {},
      }));
    } catch (err: any) {
      this.logger.error(`Failed to get tools: ${err.message}`);
      return [];
    }
  }

  /**
   * Execute a tool action for a founder.
   * Handles Tier 1 (auto) and queues Tier 3 (approval required) actions.
   */
  async executeTool(
    founderId: string,
    toolName: string,
    params: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    try {
      this.logger.log(`Executing tool ${toolName} for founder ${founderId}`);

      const result = await this.composio.executeAction(founderId, toolName, params);

      return {
        success: true,
        toolName,
        result,
      };
    } catch (err: any) {
      this.logger.error(`Tool execution failed: ${err.message}`);
      return {
        success: false,
        toolName,
        error: err.message,
      };
    }
  }

  /**
   * AI-powered tool suggestion based on the founder's intent.
   * Suggests which tools would be most useful for a given task.
   */
  async suggestTools(
    founderId: string,
    intent: string,
  ): Promise<ToolSuggestion[]> {
    const tools = await this.getAvailableTools(founderId);
    if (tools.length === 0) return [];

    const toolList = tools.slice(0, 50).map(
      (t: { name: string; description: string }) => `${t.name}: ${t.description}`,
    ).join('\n');

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a tool recommendation engine. Given the founder's intent, suggest which tools from the list below would be most useful.

Output valid JSON array:
[
  { "toolName": "<exact tool name>", "appName": "<app>", "description": "<why this tool helps>", "relevance": 0.0-1.0 }
]

Only include tools with relevance > 0.3. Return max 5 suggestions.`,
      },
      {
        role: 'user',
        content: `Founder's intent: ${intent}\n\nAvailable tools:\n${toolList}`,
      },
    ], { maxTokens: 512, temperature: 0.2 });

    try {
      const suggestions = JSON.parse(response.content);
      return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  /**
   * Search available tools by keyword.
   */
  async searchTools(query: string) {
    try {
      const tools = await this.composio.getToolsForFounder('system');
      const q = query.toLowerCase();

      return tools
        .filter((tool: any) => {
          const name = (tool.name || '').toLowerCase();
          const desc = (tool.description || '').toLowerCase();
          return name.includes(q) || desc.includes(q);
        })
        .map((tool: any) => ({
          name: tool.name,
          displayName: this.formatName(tool.name),
          description: tool.description || '',
          appName: tool.appName || tool.name?.split('_')[0],
        }));
    } catch (err: any) {
      this.logger.error(`Failed to search tools: ${err.message}`);
      return [];
    }
  }

  /**
   * Get all available Composio apps with their connection status for a founder.
   */
  async getAppsStatus(founderId: string) {
    const status = await this.composio.getConnectionStatus(founderId);
    return status;
  }

  private formatName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
}
