import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentToolConnectorService } from '../connector/agent-tool-connector.service.js';
import { SpecialistAgent, AgentResult } from './agent-orchestrator.service.js';

@Injectable()
export class GoogleAdsAgent implements SpecialistAgent {
  name = 'Google Ads Agent';
  layer = 'MARKETING';
  private readonly logger = new Logger(GoogleAdsAgent.name);

  capabilities = [
    { name: 'Campaign Setup', description: 'Create Search, Display, Shopping campaigns', examples: ['Create a Google Search campaign'] },
    { name: 'Keyword Research', description: 'Find high-intent keywords', examples: ['Research keywords for my SaaS'] },
    { name: 'Ad Copy', description: 'Write responsive search ads', examples: ['Write 3 responsive search ads'] },
    { name: 'Bid Strategy', description: 'Optimize bidding for conversions', examples: ['Optimize my bid strategy'] },
    { name: 'Quality Score', description: 'Improve quality score and lower CPC', examples: ['How to improve quality score?'] },
  ];

  constructor(private llm: LLMService, private tools: AgentToolConnectorService) {}

  canHandle(intent: string): boolean {
    return ['google ads', 'adwords', 'search campaign', 'display campaign', 'youtube ad', 'quality score', 'negative keyword', 'bid strategy'].some(k => intent.toLowerCase().includes(k));
  }

  async execute(founderId: string, _intent: string, _params: Record<string, string>, message: string): Promise<AgentResult> {
    const toolCalls: AgentResult['toolCalls'] = [];
    try {
      const result = await this.tools.executeTool(founderId, 'GOOGLEADS_CREATE_CAMPAIGN', { name: 'Helm Campaign', type: 'SEARCH', status: 'PAUSED' });
      if (result.success) toolCalls?.push({ tool: 'GOOGLEADS_CREATE_CAMPAIGN', input: {}, output: result.result });
    } catch { /* not connected */ }

    const response = await this.llm.complete([
      { role: 'system', content: 'You are a Google Ads expert. Provide campaign plans with keywords, ad copy, and structure. Output JSON: {"plan":"<markdown>","keywords":[{"keyword":"","matchType":"","estCPC":""}],"adCopy":[{"headline":"","description":""}],"suggestions":[""]}' },
      { role: 'user', content: message },
    ], { maxTokens: 2048, temperature: 0.5 });

    try {
      const parsed = JSON.parse(response.content);
      let md = `## 🔍 Google Ads\n\n${parsed.plan}\n\n`;
      if (parsed.keywords?.length > 0) { md += `### Keywords\n`; for (const kw of parsed.keywords.slice(0, 10)) { md += `- **${kw.keyword}** (${kw.matchType}) — Est CPC: ${kw.estCPC}\n`; } md += '\n'; }
      if (parsed.adCopy?.length > 0) { md += `### Ad Copy\n`; for (const ad of parsed.adCopy) { md += `- **${ad.headline}** — ${ad.description}\n`; } }
      return { agentName: this.name, response: md, toolCalls, suggestions: parsed.suggestions || [], confidence: 0.85 };
    } catch { return { agentName: this.name, response: response.content, toolCalls, confidence: 0.7 }; }
  }
}
