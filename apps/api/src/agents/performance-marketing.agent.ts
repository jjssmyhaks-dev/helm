import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { SpecialistAgent, AgentResult } from './agent-orchestrator.service.js';

@Injectable()
export class PerformanceMarketingAgent implements SpecialistAgent {
  name = 'Performance Marketing Agent';
  layer = 'MARKETING';
  private readonly logger = new Logger(PerformanceMarketingAgent.name);

  capabilities = [
    { name: 'Campaign Strategy', description: 'Design full-funnel paid ad campaigns', examples: ['Create a performance marketing strategy', 'Design a lead gen campaign'] },
    { name: 'Budget Allocation', description: 'Optimize ad spend across channels', examples: ['How should I allocate ₹1L budget?', 'Optimize my ad spend'] },
    { name: 'Conversion Optimization', description: 'Improve landing pages, funnels, CTAs', examples: ['My landing page converts at 1%', 'Optimize my conversion funnel'] },
    { name: 'A/B Testing Plans', description: 'Design ad creative and landing page tests', examples: ['Create an A/B test plan for my ads', 'Test different headlines'] },
    { name: 'Attribution Analysis', description: 'Understand which channels drive results', examples: ['Which channel drives the most conversions?', 'Set up attribution tracking'] },
    { name: 'Retargeting Strategy', description: 'Build retargeting audiences and campaigns', examples: ['Create a retargeting campaign', 'Build a retargeting funnel'] },
  ];

  constructor(private llm: LLMService) {}

  canHandle(intent: string, params: Record<string, string>): boolean {
    const keywords = ['performance', 'paid ads', 'ppc', 'campaign', 'conversion', 'funnel', 'retargeting', 'attribution', 'roas', 'cpa', 'cpc', 'cpm', 'ad spend', 'budget allocation', 'a/b test'];
    return keywords.some((k) => intent.toLowerCase().includes(k));
  }

  async execute(founderId: string, intent: string, params: Record<string, string>, message: string): Promise<AgentResult> {
    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a senior performance marketing strategist for startups.
You specialize in multi-channel paid acquisition (Meta, Google, LinkedIn, programmatic).

Provide detailed, actionable performance marketing plans with specific tactics, budgets, and KPIs.
Output valid JSON:
{
  "strategy": "<detailed strategy in markdown>",
  "channelMix": [{ "channel": "<name>", "budget": "<amount>", "expectedROAS": "<ratio>", "objective": "<goal>" }],
  "kpis": [{ "metric": "<name>", "target": "<value>", "timeline": "<when>" }],
  "tactics": ["<specific tactic>"],
  "risks": ["<potential risk>"],
  "recommendations": ["<recommendation>"]
}`,
      },
      { role: 'user', content: message },
    ], { maxTokens: 2048, temperature: 0.5 });

    try {
      const parsed = JSON.parse(response.content);
      let md = `## 📈 Performance Marketing Strategy\n\n${parsed.strategy}\n\n`;
      if (parsed.channelMix?.length > 0) {
        md += `### Channel Mix\n| Channel | Budget | Expected ROAS | Objective |\n|---|---|---|---|\n`;
        for (const ch of parsed.channelMix) {
          md += `| ${ch.channel} | ${ch.budget} | ${ch.expectedROAS} | ${ch.objective} |\n`;
        }
        md += '\n';
      }
      if (parsed.kpis?.length > 0) {
        md += `### KPIs\n${parsed.kpis.map((k: any) => `- **${k.metric}**: ${k.target} (${k.timeline})`).join('\n')}\n\n`;
      }
      if (parsed.tactics?.length > 0) {
        md += `### Tactics\n${parsed.tactics.map((t: string) => `- ${t}`).join('\n')}\n`;
      }
      return { agentName: this.name, response: md, suggestions: parsed.recommendations || [], confidence: 0.85 };
    } catch {
      return { agentName: this.name, response: response.content, confidence: 0.7 };
    }
  }
}
