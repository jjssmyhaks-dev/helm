import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentToolConnectorService } from '../connector/agent-tool-connector.service.js';
import { SpecialistAgent, AgentResult } from './agent-orchestrator.service.js';

@Injectable()
export class MetaAdsAgent implements SpecialistAgent {
  name = 'Meta Ads Agent';
  layer = 'MARKETING';
  private readonly logger = new Logger(MetaAdsAgent.name);

  capabilities = [
    { name: 'Campaign Creation', description: 'Create Meta (Facebook/Instagram) ad campaigns', examples: ['Create a Meta ads campaign', 'Launch a Facebook ad'] },
    { name: 'Audience Building', description: 'Build custom audiences, lookalikes', examples: ['Create a lookalike audience', 'Build a retargeting audience'] },
    { name: 'Creative Strategy', description: 'Ad creative concepts, copy, formats', examples: ['Write ad copy for Instagram', 'Create 5 ad variations'] },
    { name: 'Campaign Optimization', description: 'Optimize bidding, targeting, placement', examples: ['Optimize my Meta ads', 'Reduce my CPA on Facebook'] },
    { name: 'Performance Reporting', description: 'Analyze Meta ads performance data', examples: ['Show my Meta ads performance', 'What\'s my ROAS on Facebook?'] },
  ];

  constructor(private llm: LLMService, private tools: AgentToolConnectorService) {}

  canHandle(intent: string, params: Record<string, string>): boolean {
    const keywords = ['meta ads', 'facebook ads', 'instagram ads', 'fb ads', 'meta campaign', 'facebook campaign'];
    return keywords.some((k) => intent.toLowerCase().includes(k));
  }

  async execute(founderId: string, intent: string, params: Record<string, string>, message: string): Promise<AgentResult> {
    const action = this.detectAction(message);
    const toolCalls: AgentResult['toolCalls'] = [];

    // Try to use Meta Ads via Composio if connected
    try {
      const result = await this.tools.executeTool(founderId, 'METAADS_CREATE_CAMPAIGN', {
        name: params.name || 'Helm Campaign',
        objective: params.objective || 'OUTCOME_LEADS',
        status: 'PAUSED',
      });
      if (result.success) {
        toolCalls?.push({ tool: 'METAADS_CREATE_CAMPAIGN', input: params, output: result.result });
      }
    } catch {
      // Composio not connected — provide guidance instead
    }

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a Meta (Facebook/Instagram) ads expert.
Specialize in: ${action}

Provide specific, actionable Meta ads guidance including:
- Campaign structure (campaign → ad set → ad)
- Audience targeting recommendations
- Budget and bidding strategy
- Creative recommendations
- KPIs to track

Output valid JSON:
{
  "plan": "<detailed plan in markdown>",
  "campaignStructure": [{ "level": "<campaign/adset/ad>", "name": "<name>", "settings": "<key settings>" }],
  "audienceRecommendations": ["<audience suggestion>"],
  "creativeRecommendations": ["<creative suggestion>"],
  "budget": "<recommended budget allocation>",
  "suggestions": ["<next step>"]
}`,
      },
      { role: 'user', content: message },
    ], { maxTokens: 2048, temperature: 0.5 });

    try {
      const parsed = JSON.parse(response.content);
      let md = `## 📱 Meta Ads — ${action}\n\n${parsed.plan}\n\n`;
      if (parsed.campaignStructure?.length > 0) {
        md += `### Campaign Structure\n`;
        for (const item of parsed.campaignStructure) {
          md += `- **${item.level}**: ${item.name} — ${item.settings}\n`;
        }
        md += '\n';
      }
      if (parsed.audienceRecommendations?.length > 0) {
        md += `### 👥 Audience\n${parsed.audienceRecommendations.map((a: string) => `- ${a}`).join('\n')}\n\n`;
      }
      if (parsed.creativeRecommendations?.length > 0) {
        md += `### 🎨 Creative\n${parsed.creativeRecommendations.map((c: string) => `- ${c}`).join('\n')}\n`;
      }
      return { agentName: this.name, response: md, toolCalls, suggestions: parsed.suggestions || [], confidence: 0.85 };
    } catch {
      return { agentName: this.name, response: response.content, toolCalls, confidence: 0.7 };
    }
  }

  private detectAction(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('create') || msg.includes('launch')) return 'Campaign Creation';
    if (msg.includes('audience') || msg.includes('lookalike')) return 'Audience Strategy';
    if (msg.includes('creative') || msg.includes('copy')) return 'Creative Strategy';
    if (msg.includes('optimiz') || msg.includes('improve')) return 'Campaign Optimization';
    if (msg.includes('report') || msg.includes('performance')) return 'Performance Reporting';
    return 'Campaign Strategy';
  }
}
