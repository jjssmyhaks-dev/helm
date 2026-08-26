import { Injectable } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentToolConnectorService } from '../connector/agent-tool-connector.service.js';
import { AgentBase, AgentConfig } from './agent-base.js';
import { AgentResult } from './agent-orchestrator.service.js';

const CONFIG: AgentConfig = {
  name: 'Meta Ads Agent',
  layer: 'MARKETING',
  intentKeywords: ['meta ads', 'facebook ads', 'instagram ads', 'fb ads', 'meta campaign', 'facebook campaign'],
  capabilities: [
    { name: 'Campaign Creation', description: 'Create Meta ad campaigns', examples: ['Create a Meta ads campaign'] },
    { name: 'Audience Building', description: 'Build custom audiences, lookalikes', examples: ['Create a lookalike audience'] },
    { name: 'Creative Strategy', description: 'Ad creative concepts, copy, formats', examples: ['Write ad copy for Instagram'] },
    { name: 'Campaign Optimization', description: 'Optimize bidding, targeting', examples: ['Optimize my Meta ads'] },
    { name: 'Performance Reporting', description: 'Analyze Meta ads performance', examples: ['Show my Meta ads ROAS'] },
  ],
  systemPrompt: `You are a Meta (Facebook/Instagram) ads expert.
Provide campaign structure, audience targeting, budget, bidding, creative recommendations, and KPIs.
Output valid JSON:
{"plan":"<markdown>","campaignStructure":[{"level":"","name":"","settings":""}],"audienceRecommendations":[""],"creativeRecommendations":[""],"suggestions":[""]}`,
};

@Injectable()
export class MetaAdsAgent extends AgentBase {
  readonly name = CONFIG.name;
  readonly layer = CONFIG.layer;
  readonly capabilities = CONFIG.capabilities;

  constructor(llm: LLMService, private tools: AgentToolConnectorService) { super(llm, CONFIG); }

  protected override async beforeLLM(founderId: string): Promise<AgentResult['toolCalls']> {
    const toolCalls: AgentResult['toolCalls'] = [];
    try {
      const result = await this.tools.executeTool(founderId, 'METAADS_CREATE_CAMPAIGN', { name: 'Helm Campaign', objective: 'OUTCOME_LEADS', status: 'PAUSED' });
      if (result.success) toolCalls.push({ tool: 'METAADS_CREATE_CAMPAIGN', input: {}, output: result.result });
    } catch { /* not connected */ }
    return toolCalls;
  }

  protected override formatResponse(parsed: Record<string, any>): string {
    let md = `## 📱 Meta Ads\n\n${parsed.plan || ''}\n\n`;
    if (parsed.campaignStructure?.length > 0) {
      md += `### Campaign Structure\n`;
      for (const item of parsed.campaignStructure) md += `- **${item.level}**: ${item.name} — ${item.settings}\n`;
      md += '\n';
    }
    if (parsed.audienceRecommendations?.length > 0) md += `### 👥 Audience\n${parsed.audienceRecommendations.map((a: string) => `- ${a}`).join('\n')}\n\n`;
    if (parsed.creativeRecommendations?.length > 0) md += `### 🎨 Creative\n${parsed.creativeRecommendations.map((c: string) => `- ${c}`).join('\n')}\n`;
    return md;
  }
}
