import { Injectable, Logger } from '@nestjs/common';
import { AgentLayer } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { EventBusService } from '../event/event-bus.service.js';
import { LayerOrchestratorService } from './layer-orchestrator.service.js';
import { ContextService } from '../context/context.service.js';
import { LLMService } from '../llm/llm.service.js';

const LAYER_KEYWORDS: Record<AgentLayer, string[]> = {
  RESEARCH: ['research', 'competitor', 'market', 'trend', 'benchmark', 'pricing research', 'audience', 'sentiment', 'industry'],
  MARKETING: ['marketing', 'ads', 'campaign', 'content', 'copy', 'seo', 'social', 'landing page', 'email', 'blog', 'design', 'creative'],
  OPERATIONS: ['operations', 'process', 'workflow', 'vendor', 'supplier', 'fulfillment', 'support', 'scheduling', 'inventory', 'delivery'],
  FINANCE: ['finance', 'cash flow', 'revenue', 'expense', 'bookkeeping', 'tax', 'compliance', 'gst', 'fundraising', 'investor', 'runway', 'budget', 'margin'],
};

@Injectable()
export class GlobalOrchestratorService {
  private readonly logger = new Logger(GlobalOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
    private layerOrchestrator: LayerOrchestratorService,
    private contextService: ContextService,
    private llm: LLMService,
  ) {}

  async processMessage(founderId: string, content: string) {
    const context = await this.contextService.retrieveRelevant(founderId, content);
    const classification = await this.classifyIntent(content, context);
    const results = await this.routeToLayers(founderId, classification, content);
    const responseText = await this.generateResponse(content, results, context);

    return {
      response: responseText,
      tasks: results.tasks,
      layers: results.routedLayers,
    };
  }

  private async classifyIntent(
    content: string,
    context: string[],
  ): Promise<{
    layers: AgentLayer[];
    taskDescriptions: string[];
    isQuestion: boolean;
    urgency: 'low' | 'medium' | 'high';
  }> {
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `Classify this founder message. Output valid JSON:
{
  "layers": ["RESEARCH"|"MARKETING"|"OPERATIONS"|"FINANCE"],
  "taskDescriptions": ["task for each layer"],
  "isQuestion": true/false,
  "urgency": "low|medium|high"
}`,
      },
      {
        role: 'user',
        content: `Founder message: "${content}"
Context: ${context.length > 0 ? context.join('; ') : 'None'}`,
      },
    ], { maxTokens: 512, temperature: 0.2 });

    try {
      const parsed = JSON.parse(response.content);
      // Validate layers are valid AgentLayer values
      parsed.layers = (parsed.layers || []).filter((l: string) =>
        ['RESEARCH', 'MARKETING', 'OPERATIONS', 'FINANCE'].includes(l),
      );
      if (parsed.layers.length === 0) parsed.layers = ['RESEARCH'];
      return parsed;
    } catch {
      return this.keywordClassification(content);
    }
  }

  private keywordClassification(content: string) {
    const lower = content.toLowerCase();
    const matchedLayers: AgentLayer[] = [];
    const descriptions: string[] = [];

    for (const [layer, keywords] of Object.entries(LAYER_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        matchedLayers.push(layer as AgentLayer);
        descriptions.push(`Process founder request: ${content}`);
      }
    }

    if (matchedLayers.length === 0) {
      matchedLayers.push('RESEARCH');
      descriptions.push(`Process founder request: ${content}`);
    }

    return {
      layers: matchedLayers,
      taskDescriptions: descriptions,
      isQuestion: lower.includes('?') || lower.startsWith('how') || lower.startsWith('what'),
      urgency: 'medium' as const,
    };
  }

  private async routeToLayers(
    founderId: string,
    classification: { layers: AgentLayer[]; taskDescriptions: string[] },
    originalMessage: string,
  ) {
    const allTasks: any[] = [];
    const routedLayers: AgentLayer[] = [];

    for (let i = 0; i < classification.layers.length; i++) {
      const layer = classification.layers[i];
      const description = classification.taskDescriptions[i] || originalMessage;

      try {
        const result = await this.layerOrchestrator.handleTask(founderId, layer, description);
        allTasks.push(...result.tasks);
        routedLayers.push(layer);
      } catch (err) {
        this.logger.error(`Failed to route to layer ${layer}:`, err);
      }
    }

    return { tasks: allTasks, routedLayers };
  }

  private async generateResponse(
    originalMessage: string,
    results: { tasks: any[]; routedLayers: AgentLayer[] },
    context: string[],
  ): Promise<string> {
    const taskSummaries = results.tasks
      .map((t) => `- ${t.title} (${t.layer}, ${t.status})`)
      .join('\n');

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are Helm, an AI operating system for solo founders. Respond concisely. Acknowledge the request, mention which teams are working on it, and what they'll do.`,
      },
      {
        role: 'user',
        content: `Founder: "${originalMessage}"
Context: ${context.length > 0 ? context.join('; ') : 'None'}
Tasks created: ${taskSummaries || 'None — this was a question.'}`,
      },
    ], { maxTokens: 512, temperature: 0.5 });

    return response.content;
  }
}
