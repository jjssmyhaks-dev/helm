import { Injectable } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentToolConnectorService } from '../connector/agent-tool-connector.service.js';
import { AgentBase, AgentConfig } from './agent-base.js';
import { AgentResult } from './agent-orchestrator.service.js';

const CONFIG: AgentConfig = {
  name: 'Google Ads Agent',
  layer: 'MARKETING',
  intentKeywords: ['google ads', 'adwords', 'search campaign', 'display campaign', 'youtube ad', 'quality score', 'negative keyword', 'bid strategy'],
  capabilities: [
    { name: 'Campaign Setup', description: 'Create Search, Display, Shopping campaigns', examples: ['Create a Google Search campaign'] },
    { name: 'Keyword Research', description: 'Find high-intent keywords', examples: ['Research keywords for my SaaS'] },
    { name: 'Ad Copy', description: 'Write responsive search ads', examples: ['Write 3 responsive search ads'] },
    { name: 'Bid Strategy', description: 'Optimize bidding for conversions', examples: ['Optimize my bid strategy'] },
    { name: 'Quality Score', description: 'Improve quality score and lower CPC', examples: ['How to improve quality score?'] },
  ],
  systemPrompt: `You are a Google Ads expert. Provide campaign plans with keywords, ad copy, and structure.\nOutput valid JSON:\n{"plan":"<markdown>","keywords":[{"keyword":"","matchType":"","estCPC":""}],"adCopy":[{"headline":"","description":""}],"suggestions":[""]}`,
};

@Injectable()
export class GoogleAdsAgent extends AgentBase {
  readonly name = CONFIG.name;
  readonly layer = CONFIG.layer;
  readonly capabilities = CONFIG.capabilities;

  constructor(llm: LLMService, private tools: AgentToolConnectorService) { super(llm, CONFIG); }

  protected override async beforeLLM(founderId: string): Promise<AgentResult['toolCalls']> {
    const toolCalls: AgentResult['toolCalls'] = [];
    try {
      const result = await this.tools.executeTool(founderId, 'GOOGLEADS_CREATE_CAMPAIGN', { name: 'Helm Campaign', type: 'SEARCH', status: 'PAUSED' });
      if (result.success) toolCalls.push({ tool: 'GOOGLEADS_CREATE_CAMPAIGN', input: {}, output: result.result });
    } catch { /* not connected */ }
    return toolCalls;
  }

  protected override formatResponse(parsed: Record<string, any>): string {
    let md = `## 🔍 Google Ads\n\n${parsed.plan || ''}\n\n`;
    if (parsed.keywords?.length > 0) {
      md += `### Keywords\n`;
      for (const kw of parsed.keywords.slice(0, 10)) md += `- **${kw.keyword}** (${kw.matchType}) — Est CPC: ${kw.estCPC}\n`;
      md += '\n';
    }
    if (parsed.adCopy?.length > 0) {
      md += `### Ad Copy\n`;
      for (const ad of parsed.adCopy) md += `- **${ad.headline}** — ${ad.description}\n`;
    }
    return md;
  }
}
