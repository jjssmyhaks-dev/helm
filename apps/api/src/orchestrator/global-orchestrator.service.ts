import { Injectable, Logger } from '@nestjs/common';
import { LayerName } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../database/prisma.service.js';
import { EventBusService } from '../event/event-bus.service.js';
import { LayerOrchestratorService } from './layer-orchestrator.service.js';
import { ContextService } from '../context/context.service.js';

const LAYER_KEYWORDS: Record<LayerName, string[]> = {
  RESEARCH: ['research', 'competitor', 'market', 'trend', 'benchmark', 'pricing research', 'audience', 'sentiment', 'industry'],
  MARKETING: ['marketing', 'ads', 'campaign', 'content', 'copy', 'seo', 'social', 'landing page', 'email', 'blog', 'design', 'creative'],
  OPERATIONS: ['operations', 'process', 'workflow', 'vendor', 'supplier', 'fulfillment', 'support', 'scheduling', 'inventory', 'delivery'],
  FINANCE: ['finance', 'cash flow', 'revenue', 'expense', 'bookkeeping', 'tax', 'compliance', 'gst', 'fundraising', 'investor', 'runway', 'budget', 'margin'],
};

@Injectable()
export class GlobalOrchestratorService {
  private readonly logger = new Logger(GlobalOrchestratorService.name);
  private anthropic: Anthropic;

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
    private layerOrchestrator: LayerOrchestratorService,
    private contextService: ContextService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Process a founder message — classify intent, route to appropriate layer(s),
   * decompose into tasks, and return a response.
   */
  async processMessage(founderId: string, content: string) {
    // 1. Retrieve relevant context from memory
    const context = await this.contextService.retrieveRelevant(founderId, content);

    // 2. Use LLM to classify the message and extract actionable intent
    const classification = await this.classifyIntent(content, context);

    // 3. Route to appropriate layer(s)
    const results = await this.routeToLayers(founderId, classification, content);

    // 4. Generate response
    const responseText = await this.generateResponse(content, results, context);

    return {
      response: responseText,
      tasks: results.tasks,
      layers: results.routedLayers,
    };
  }

  /**
   * Use Claude to classify the founder's intent and determine routing.
   */
  private async classifyIntent(
    content: string,
    context: string[],
  ): Promise<{
    layers: LayerName[];
    taskDescriptions: string[];
    isQuestion: boolean;
    urgency: 'low' | 'medium' | 'high';
  }> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are the Global Orchestrator for Helm, an AI operating system for solo founders.

Classify this founder message into routing information.

Founder message: "${content}"

Relevant context from memory:
${context.length > 0 ? context.map((c) => `- ${c}`).join('\n') : 'No relevant context found.'}

Respond with a JSON object:
{
  "layers": ["<layer names from: research, marketing, operations, finance>"],
  "taskDescriptions": ["<specific task description for each layer>"],
  "isQuestion": <true if founder is asking a question, false if requesting action>,
  "urgency": "<low|medium|high>"
}

Only include layers that are genuinely relevant. A single message can target multiple layers.
For cross-functional requests (e.g., "launch a new product"), include all relevant layers.`,
          },
        ],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      this.logger.error('Intent classification failed, falling back to keyword matching', err);
    }

    // Fallback: keyword-based classification
    return this.keywordClassification(content);
  }

  private keywordClassification(content: string): {
    layers: LayerName[];
    taskDescriptions: string[];
    isQuestion: boolean;
    urgency: 'low' | 'medium' | 'high';
  } {
    const lower = content.toLowerCase();
    const matchedLayers: LayerName[] = [];
    const descriptions: string[] = [];

    for (const [layer, keywords] of Object.entries(LAYER_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        matchedLayers.push(layer as LayerName);
        descriptions.push(`Process founder request: ${content}`);
      }
    }

    // Default to research if no match
    if (matchedLayers.length === 0) {
      matchedLayers.push('RESEARCH');
      descriptions.push(`Process founder request: ${content}`);
    }

    return {
      layers: matchedLayers,
      taskDescriptions: descriptions,
      isQuestion: lower.includes('?') || lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('why') || lower.startsWith('when'),
      urgency: 'medium',
    };
  }

  /**
   * Route classified intent to the appropriate layer orchestrators.
   */
  private async routeToLayers(
    founderId: string,
    classification: { layers: LayerName[]; taskDescriptions: string[] },
    originalMessage: string,
  ) {
    const allTasks: any[] = [];
    const routedLayers: LayerName[] = [];

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

  /**
   * Generate a natural language response from the orchestrator.
   */
  private async generateResponse(
    originalMessage: string,
    results: { tasks: any[]; routedLayers: LayerName[] },
    context: string[],
  ): Promise<string> {
    try {
      const taskSummaries = results.tasks
        .map((t) => `- ${t.title} (Layer: ${t.layer}, Status: ${t.status})`)
        .join('\n');

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are Helm, an AI operating system for solo founders. Respond to the founder naturally.

Founder said: "${originalMessage}"

Context: ${context.length > 0 ? context.join('; ') : 'No prior context.'}

Tasks created:
${taskSummaries || 'No tasks created — this was a question.'}

Respond concisely as Helm. Acknowledge what you've understood, mention which team members (layers) are working on it, and what they'll do. If it was a question, answer directly.`,
          },
        ],
      });

      return message.content[0].type === 'text' ? message.content[0].text : 'Task processed.';
    } catch (err) {
      this.logger.error('Response generation failed', err);
      return `I've routed your request to the following teams: ${results.routedLayers.join(', ')}. ${results.tasks.length} task(s) have been created and are being worked on.`;
    }
  }
}
