import { Injectable } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentBase, AgentConfig } from './agent-base.js';

const CONFIG: AgentConfig = {
  name: 'Performance Marketing Agent',
  layer: 'MARKETING',
  intentKeywords: ['performance', 'paid ads', 'ppc', 'campaign', 'conversion', 'funnel', 'retargeting', 'attribution', 'roas', 'cpa', 'cpc', 'cpm', 'ad spend', 'budget allocation', 'a/b test'],
  capabilities: [
    { name: 'Campaign Strategy', description: 'Design full-funnel paid ad campaigns', examples: ['Create a performance marketing strategy'] },
    { name: 'Budget Allocation', description: 'Optimize ad spend across channels', examples: ['How should I allocate ₹1L budget?'] },
    { name: 'Conversion Optimization', description: 'Improve landing pages, funnels, CTAs', examples: ['My landing page converts at 1%'] },
    { name: 'A/B Testing Plans', description: 'Design ad creative and landing page tests', examples: ['Create an A/B test plan'] },
    { name: 'Attribution Analysis', description: 'Understand which channels drive results', examples: ['Which channel drives conversions?'] },
    { name: 'Retargeting Strategy', description: 'Build retargeting audiences and campaigns', examples: ['Create a retargeting campaign'] },
  ],
  systemPrompt: `You are a senior performance marketing strategist for startups.
Provide detailed plans with tactics, budgets, and KPIs.
Output valid JSON:
{"strategy":"<markdown>","channelMix":[{"channel":"","budget":"","expectedROAS":"","objective":""}],"kpis":[{"metric":"","target":"","timeline":""}],"tactics":[""],"recommendations":[""]}`,
};

@Injectable()
export class PerformanceMarketingAgent extends AgentBase {
  readonly name = CONFIG.name;
  readonly layer = CONFIG.layer;
  readonly capabilities = CONFIG.capabilities;

  constructor(llm: LLMService) { super(llm, CONFIG); }

  protected override formatResponse(parsed: Record<string, any>): string {
    let md = `## 📈 Performance Marketing Strategy\n\n${parsed.strategy || ''}\n\n`;
    if (parsed.channelMix?.length > 0) {
      md += `### Channel Mix\n| Channel | Budget | ROAS | Objective |\n|---|---|---|---|\n`;
      for (const ch of parsed.channelMix) md += `| ${ch.channel} | ${ch.budget} | ${ch.expectedROAS} | ${ch.objective} |\n`;
      md += '\n';
    }
    if (parsed.kpis?.length > 0) md += `### KPIs\n${parsed.kpis.map((k: any) => `- **${k.metric}**: ${k.target} (${k.timeline})`).join('\n')}\n\n`;
    if (parsed.tactics?.length > 0) md += `### Tactics\n${parsed.tactics.map((t: string) => `- ${t}`).join('\n')}\n`;
    return md;
  }
}
